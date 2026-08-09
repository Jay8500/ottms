import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import { IonContent, IonIcon, IonSpinner, AlertController } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { addIcons } from 'ionicons';
import { callOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { humanError } from '../shared/errors';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
})
export class LoginPage {
  mobile = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private auth: Auth,
    private router: Router,
    private alertCtrl: AlertController,
  ) {
    addIcons({ callOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  ionViewDidEnter() {
    // The Keyboard plugin has no web implementation and rejects rather than
    // throwing, so a plain try/catch never caught it.
    if (!Capacitor.isNativePlatform()) return;
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => { /* not fatal */ });
  }

  async login() {
    this.error = '';

    if (!this.mobile || !this.password) {
      this.error = 'Enter your mobile number and password'; return;
    }
    if (this.mobile.length !== 10) {
      this.error = 'Enter a valid 10-digit mobile number'; return;
    }

    this.loading = true;
    try {
      const profile = await this.auth.signIn(this.mobile, this.password);
      this.router.navigate([`/${profile.role}`], { replaceUrl: true });
    } catch (e: any) {
      this.error = humanError(e, 'Could not sign in. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  async forgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Forgot Password',
      message:
        'Password reset needs an SMS provider, which is not connected yet. ' +
        'Please contact support to have your password reset.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  goRegister() { this.router.navigate(['/register']); }

}