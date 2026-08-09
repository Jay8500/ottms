import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AlertController } from '@ionic/angular/standalone';
import { DataService } from './data.service';

const LAST_ROUTE = 'ms_last_route';
const LAST_ROUTE_AT = 'ms_last_route_at';

/** Screens where hardware Back should offer to exit rather than navigate. */
const ROOTS = ['/user/home', '/admin/dashboard', '/login', '/register'];

/** Don't resume onto a screen the user left days ago. */
const RESUME_WINDOW_MS = 1000 * 60 * 60 * 6;

/**
 * Everything that makes this feel like an Android app rather than a web page:
 * hardware back, resume-where-you-left-off, status bar, splash, presence.
 *
 * All of it degrades quietly in the browser, where the plugins do not exist.
 */
@Injectable({ providedIn: 'root' })
export class NativeService {
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private data = inject(DataService);

  private lastBackPress = 0;
  private started = false;

  get isNative() { return Capacitor.isNativePlatform(); }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.trackRoute();

    if (!this.isNative) return;

    await this.chrome();
    this.hardwareBack();
    this.lifecycle();
  }

  // ── Chrome ──────────────────────────────────────────────────────────────
  private async chrome() {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    } catch { /* not all Android versions allow this */ }

    try {
      // Let the page resize instead of the keyboard covering inputs.
      await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch { /* ignore */ }

    // Hide only once the first view is actually painted.
    setTimeout(() => SplashScreen.hide().catch(() => {}), 250);
  }

  // ── Hardware back ───────────────────────────────────────────────────────
  private hardwareBack() {
    App.addListener('backButton', async () => {
      // 1. An open overlay always wins.
      const overlay = document.querySelector<HTMLIonModalElement>(
        'ion-alert, ion-action-sheet, ion-modal, ion-popover, ion-picker',
      );
      if (overlay?.dismiss) { await overlay.dismiss(); return; }

      // 2. Our own in-page sheets are plain divs, not Ionic overlays.
      const sheet = document.querySelector<HTMLElement>('.ee-sheet, .pay-sheet');
      if (sheet) {
        (document.querySelector<HTMLElement>('.ee-backdrop, .pay-backdrop'))?.click();
        return;
      }

      // 3. At a root screen, ask before leaving. Double-tap to confirm is the
      //    Android convention and avoids a dialog on every stray back press.
      if (this.atRoot()) {
        const now = Date.now();
        if (now - this.lastBackPress < 2000) { App.exitApp(); return; }
        this.lastBackPress = now;
        await this.toastExit();
        return;
      }

      // 4. Otherwise walk the history.
      if (window.history.length > 1) window.history.back();
      else this.router.navigateByUrl('/user/home', { replaceUrl: true });
    });
  }

  private atRoot() {
    const url = this.router.url.split('?')[0];
    return ROOTS.includes(url);
  }

  private async toastExit() {
    const alert = await this.alertCtrl.create({
      header: 'Close Money Saver?',
      message: 'Press back again to exit.',
      buttons: [{ text: 'Stay', role: 'cancel' }],
    });
    await alert.present();
    setTimeout(() => alert.dismiss().catch(() => {}), 1800);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  private lifecycle() {
    App.addListener('appStateChange', ({ isActive }) => {
      this.data.setPresence(isActive);
    });

    // A deep link or notification tap lands here.
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const path = new URL(url).pathname;
        if (path && path !== '/') this.router.navigateByUrl(path);
      } catch { /* not a URL we own */ }
    });
  }

  // ── Resume where you left off ───────────────────────────────────────────
  private trackRoute() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects;
        if (url.startsWith('/login') || url.startsWith('/register')) return;
        Preferences.set({ key: LAST_ROUTE, value: url }).catch(() => {});
        Preferences.set({ key: LAST_ROUTE_AT, value: String(Date.now()) }).catch(() => {});
      });
  }

  /**
   * The screen to open on a cold start, or null to use the normal landing.
   * Android kills backgrounded WebViews freely, so without this a user who
   * switches apps for a minute comes back to the home screen.
   */
  async resumeRoute(): Promise<string | null> {
    try {
      const { value: url } = await Preferences.get({ key: LAST_ROUTE });
      const { value: at } = await Preferences.get({ key: LAST_ROUTE_AT });
      if (!url || !at) return null;
      if (Date.now() - Number(at) > RESUME_WINDOW_MS) return null;
      return url;
    } catch {
      return null;
    }
  }

  async clearResume() {
    await Preferences.remove({ key: LAST_ROUTE }).catch(() => {});
    await Preferences.remove({ key: LAST_ROUTE_AT }).catch(() => {});
  }

  /** Small confirmation buzz for money actions. No-op on web. */
  async tap(style: ImpactStyle = ImpactStyle.Light) {
    if (!this.isNative) return;
    try { await Haptics.impact({ style }); } catch { /* ignore */ }
  }
}