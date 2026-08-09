import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { LoadingService } from './loading.service';

/**
 * The single Supabase connection.
 *
 * ── On mobile sign-in ───────────────────────────────────────────────────
 * Supabase phone auth needs a paid SMS provider (Twilio/MessageBird) wired
 * into the project. Until the client decides on one, we sign people in with
 * email/password where the email is derived from the mobile number:
 *
 *     9182054065  ->  9182054065@moneysaver.app
 *
 * The user never sees or types this. It keeps mobile+password working today
 * and migrating to real phone OTP later is a provider setting plus a one-off
 * backfill — the profiles table already stores the real mobile separately.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient;

  private loading = inject(LoadingService);

  /** Domain for the synthetic email shim. Not a real mail domain. */
  private static readonly SHIM_DOMAIN = 'moneysaver.app';

  constructor() {
    if (!environment.supabaseUrl || !environment.supabaseKey) {
      throw new Error(
        'Supabase is not configured — set supabaseUrl and supabaseKey in src/environments/environment.ts',
      );
    }

    this.client = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,   // Capacitor has no OAuth redirect to parse

        // supabase-js coordinates token refresh across browser tabs using the
        // Web Locks API. Inside a Capacitor WebView there is only ever one
        // window, and the lock acquisition fails noisily
        // (NavigatorLockAcquireTimeoutError) which surfaces as an unhandled
        // rejection and can abort a sign-in. Running the callback directly is
        // correct here because there are no competing tabs to serialise.
        lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
      },

      global: {
        // Every query, RPC and storage call goes through here, so the progress
        // bar covers the whole app — including screens added later — without
        // each page having to track its own loading flag.
        fetch: (input: RequestInfo | URL, init?: RequestInit) => {
          this.loading.start();
          return fetch(input, init).finally(() => this.loading.stop());
        },
      },
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  private emailFor(mobile: string) {
    return `${mobile.trim()}@${SupabaseService.SHIM_DOMAIN}`;
  }

  async signUp(mobile: string, password: string, name: string, email?: string) {
    const { data, error } = await this.client.auth.signUp({
      email: this.emailFor(mobile),
      password,
      options: { data: { name, mobile, real_email: email ?? null } },
    });
    if (error) throw error;
    return data;
  }

  async signIn(mobile: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: this.emailFor(mobile),
      password,
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.client.auth.getSession();
    return data.session;
  }

  onAuthChange(cb: (session: Session | null) => void) {
    return this.client.auth.onAuthStateChange((_event, session) => cb(session));
  }

  async currentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getUser();
    return data.user?.id ?? null;
  }

  // ── Storage ───────────────────────────────────────────────────────────

  /** Uploads to a private bucket and returns the stored path (not a URL). */
  async upload(bucket: string, path: string, file: File | Blob) {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  /** Time-limited URL for a private object. Default one hour. */
  async signedUrl(bucket: string, path: string, seconds = 3600) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, seconds);
    if (error) throw error;
    return data.signedUrl;
  }

  // ── RPC ───────────────────────────────────────────────────────────────

  /** Calls a money function. Postgres exceptions surface as thrown errors. */
  async rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw error;
    return data as T;
  }
}