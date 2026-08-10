import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { ToastController } from '@ionic/angular/standalone';
import { SupabaseService } from './supabase.service';

/**
 * Firebase Cloud Messaging.
 *
 * The device registers a token, we store it against the signed-in profile,
 * and an Edge Function sends to those tokens later. The Firebase service
 * account key never comes near the app — it can only live server-side.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private sb = inject(SupabaseService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  private started = false;

  /** Call once the user is signed in — a token is useless without a profile. */
  async start(): Promise<void> {
    if (this.started || !Capacitor.isNativePlatform()) return;
    this.started = true;

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== 'granted') {
        // Denied is a normal choice, not an error. Everything else still works.
        return;
      }

      await PushNotifications.register();
      this.listen();
    } catch (e) {
      console.error('Push setup failed', e);
    }
  }

  private listen() {
    PushNotifications.addListener('registration', (t: Token) => {
      this.saveToken(t.value).catch(e => console.error('Token save failed', e));
    });

    PushNotifications.addListener('registrationError', (e) => {
      console.error('Push registration error', e);
    });

    // Delivered while the app is open — Android does not draw a tray
    // notification in that case, so show it ourselves.
    PushNotifications.addListener('pushNotificationReceived', (n: PushNotificationSchema) => {
      this.inApp(n);
    });

    // The user tapped a notification in the tray.
    PushNotifications.addListener('pushNotificationActionPerformed', (a: ActionPerformed) => {
      const route = a.notification.data?.['route'];
      if (typeof route === 'string' && route.startsWith('/')) {
        this.router.navigateByUrl(route);
      }
    });
  }

  private async saveToken(token: string) {
    const userId = await this.sb.currentUserId();
    if (!userId) return;

    // One row per device token; re-registering the same device is not a new row.
    const { error } = await this.sb.client
      .from('device_tokens')
      .upsert(
        { user_id: userId, token, platform: Capacitor.getPlatform() },
        { onConflict: 'token' },
      );
    if (error) throw error;
  }

  private async inApp(n: PushNotificationSchema) {
    const t = await this.toastCtrl.create({
      header: n.title ?? undefined,
      message: n.body ?? '',
      duration: 4000,
      position: 'top',
      buttons: n.data?.['route']
        ? [{ text: 'View', handler: () => this.router.navigateByUrl(n.data['route']) }]
        : undefined,
    });
    await t.present();
  }

  /** Drop this device's token on sign-out so the next user is not messaged. */
  async clear(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const userId = await this.sb.currentUserId();
      if (userId) {
        await this.sb.client.from('device_tokens').delete().eq('user_id', userId);
      }
      await PushNotifications.removeAllListeners();
      this.started = false;
    } catch (e) {
      console.error('Push cleanup failed', e);
    }
  }
}
