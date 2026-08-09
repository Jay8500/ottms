import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, Router } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { inject, provideAppInitializer } from '@angular/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { Auth } from './app/auth';
import { NativeService } from './app/shared/native.service';

/**
 * Runs before the router resolves the first URL.
 *
 * Order matters: restore the session first, because the guards depend on it,
 * then decide whether to reopen the screen the user was last on. Android kills
 * backgrounded WebViews freely, so without the second step a user who switches
 * apps for a minute returns to the home screen instead of where they were.
 */
function boot(auth: Auth, native: NativeService, router: Router) {
  return async () => {
    try {
      await auth.restore();
    } catch (err) {
      // A failed restore must not stop the app booting — the user simply
      // starts signed out.
      console.error('Session restore failed', err);
    }

    try {
      await native.start();
    } catch (err) {
      console.error('Native setup failed', err);
    }

    if (!auth.isLoggedIn) {
      await native.clearResume();
      return;
    }

    const last = await native.resumeRoute();
    if (!last) return;

    // Never resume a signed-in user into the other role's area.
    const area = auth.role === 'admin' ? '/admin' : '/user';
    if (!last.startsWith(area)) return;

    // Defer past the initial navigation, which would otherwise cancel this.
    setTimeout(() => router.navigateByUrl(last, { replaceUrl: true }), 0);
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideAppInitializer(() =>
      boot(inject(Auth), inject(NativeService), inject(Router))(),
    ),
  ],
});