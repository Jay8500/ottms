import { Injectable, inject, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './shared/supabase.service';
import { PushService } from './shared/push.service';

export interface UserProfile {
  id: string;
  name: string;
  uniqueNumber: number;
  mobile: string;
  email: string;
  nickName: string;
  role: 'user' | 'admin';
  isSeller: boolean;
  walletAmount: number;
  lockedAmount: number;
  unlockedAmount: number;
  avatarUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private sb = inject(SupabaseService);
  // Injector rather than a direct inject: PushService depends on Router, and
  // Auth is constructed during app initialisation before routing is ready.
  private injector = inject(Injector);

  private get push() { return this.injector.get(PushService); }

  private _user = new BehaviorSubject<UserProfile | null>(null);
  user$ = this._user.asObservable();

  get currentUser(): UserProfile | null { return this._user.getValue(); }
  get isLoggedIn(): boolean { return !!this._user.getValue(); }
  get role(): 'user' | 'admin' | null { return this._user.getValue()?.role ?? null; }
  get isSeller(): boolean { return this._user.getValue()?.isSeller ?? false; }

  /**
   * Restores the session on launch. Called by an APP_INITIALIZER so the
   * router guards never run before the answer is known.
   */
  async restore(): Promise<void> {
    const session = await this.sb.getSession();
    if (!session) { this._user.next(null); return; }
    await this.loadProfile(session.user.id);

    // Keep the app in step if the token is refreshed or revoked elsewhere.
    this.sb.onAuthChange(async (s) => {
      if (!s) { this._user.next(null); return; }
      if (s.user.id !== this.currentUser?.id) await this.loadProfile(s.user.id);
    });
  }

  async signIn(mobile: string, password: string): Promise<UserProfile> {
    const { user } = await this.sb.signIn(mobile, password);
    if (!user) throw new Error('Sign in failed');
    return this.loadProfile(user.id);
  }

  async signUp(mobile: string, password: string, name: string, email?: string) {
    const { user, session } = await this.sb.signUp(mobile, password, name, email);
    // With email confirmation switched on there is no session yet — the
    // caller should send the user to the login screen rather than onward.
    if (user && session) await this.loadProfile(user.id);
    return { needsLogin: !session };
  }

  /**
   * Reads the row the on_auth_user_created trigger made. Retries briefly
   * because the trigger and the client's first read can race on sign-up.
   */
  private async loadProfile(id: string, attempt = 0): Promise<UserProfile> {
    const { data, error } = await this.sb.client
      .from('profiles')
      .select('id, name, nick_name, unique_number, mobile, email, role, is_seller, avatar_url, wallet_locked, wallet_unlocked')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 400));
        return this.loadProfile(id, attempt + 1);
      }
      throw new Error('Your account exists but its profile is missing. Contact support.');
    }

    const profile: UserProfile = {
      id: data.id,
      name: data.name,
      nickName: data.nick_name ?? '',
      uniqueNumber: data.unique_number,
      mobile: data.mobile,
      email: data.email ?? '',
      role: data.role,
      isSeller: data.is_seller,
      avatarUrl: data.avatar_url ?? undefined,
      lockedAmount: Number(data.wallet_locked),
      unlockedAmount: Number(data.wallet_unlocked),
      walletAmount: Number(data.wallet_locked) + Number(data.wallet_unlocked),
    };

    this._user.next(profile);

    // Register for push once we know who this device belongs to. Fire and
    // forget — a denied permission must never block sign-in.
    this.push.start().catch(() => { /* not fatal */ });

    return profile;
  }

  /** Re-reads balances after a purchase or withdrawal. */
  async refresh(): Promise<void> {
    const id = this.currentUser?.id;
    if (id) await this.loadProfile(id);
  }

  async toggleSellerMode(isSeller: boolean): Promise<void> {
    const user = this.currentUser;
    if (!user) return;
    const { error } = await this.sb.client
      .from('profiles').update({ is_seller: isSeller }).eq('id', user.id);
    if (error) throw error;
    this._user.next({ ...user, isSeller });
  }

  async logout(): Promise<void> {
    // Drop the push token first, while we still have a session to delete it
    // with — otherwise the next person on this device gets their alerts.
    await this.push.clear().catch(() => { /* not fatal */ });
    await this.sb.signOut();
    this._user.next(null);
  }
}