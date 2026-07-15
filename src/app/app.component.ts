import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor(private auth: Auth, private router: Router) {
    this.auth.loadFromStorage();
    if (this.auth.isLoggedIn) {
      const role = this.auth.role;
      this.router.navigate([`/${role}`], { replaceUrl: true });
    }
  }
}
