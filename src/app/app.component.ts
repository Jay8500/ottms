import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Auth } from './auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private auth: Auth, private router: Router) {}

  async ngOnInit() {
    await this.auth.loadFromStorage();
    if (this.auth.isLoggedIn) {
      this.router.navigate([`/${this.auth.role}`], { replaceUrl: true });
    }
  }
}
