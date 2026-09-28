import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  callOutline, lockClosedOutline, eyeOutline, eyeOffOutline,
  keyOutline, arrowBackOutline,
} from 'ionicons/icons';
import { DataService } from '../shared/data.service';
import { humanError } from '../shared/errors';

/**
 * Forgot Password — was a stub alert saying "not connected yet". Client
 * sign-off: email OTP via Brevo (free), not SMS (₹5,900 DLT fee just to
 * test). Two steps: send a code to the email on file, then enter the code
 * with a new password.
 */
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, IonSpinner],
})
export class ForgotPasswordPage {
  step: 'mobile' | 'reset' = 'mobile';
  mobile = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;
  loading = false;
  error = '';

  constructor(
    private data: DataService,
    private router: Router,
    private toastCtrl: ToastController,
  ) {
    addIcons({ callOutline, lockClosedOutline, eyeOutline, eyeOffOutline, keyOutline, arrowBackOutline });
  }

  async sendCode() {
    this.error = '';
    if (this.mobile.length !== 10) { this.error = 'Enter a valid 10-digit mobile number'; return; }

    this.loading = true;
    try {
      await this.data.requestPasswordReset(this.mobile);
      this.step = 'reset';
      this.toast('Code sent to the email on your account');
    } catch (e: any) {
      this.error = humanError(e, 'Could not send the code. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  async resend() {
    this.loading = true;
    this.error = '';
    try {
      await this.data.requestPasswordReset(this.mobile);
      this.toast('Code sent again');
    } catch (e: any) {
      this.error = humanError(e, 'Could not send the code. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  async reset() {
    this.error = '';
    if (!/^\d{6}$/.test(this.otp)) { this.error = 'Enter the 6-digit code from your email'; return; }
    if (this.newPassword.length < 6) { this.error = 'Password must be at least 6 characters'; return; }
    if (this.newPassword !== this.confirmPassword) { this.error = 'Passwords do not match'; return; }

    this.loading = true;
    try {
      await this.data.confirmPasswordReset(this.mobile, this.otp, this.newPassword);
      this.toast('Password reset. Please sign in.');
      this.router.navigate(['/login'], { replaceUrl: true });
    } catch (e: any) {
      this.error = humanError(e, 'Could not reset the password. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  back() {
    if (this.step === 'reset') { this.step = 'mobile'; this.error = ''; return; }
    this.router.navigate(['/login']);
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom', color: 'success' });
    t.present();
  }
}
