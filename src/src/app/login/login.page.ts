import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import {
  IonContent, IonIcon, IonSpinner,
  ToastController, LoadingController, AlertController
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Keyboard } from '@capacitor/keyboard';
import { addIcons } from 'ionicons';
import { callOutline, lockClosedOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

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

  constructor(
    private auth: Auth,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ callOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  ionViewDidEnter() {
    Keyboard.setAccessoryBarVisible({ isVisible: false });
  }

  async login() {
    if (!this.mobile || !this.password) {
      this.showToast('Please enter mobile number and password');
      return;
    }
    this.loading = true;
    await new Promise((r) => setTimeout(r, 1000));
    const dummyRole: 'user' | 'admin' = this.mobile === '0000000000' ? 'admin' : 'user';
    this.auth.setUser({
      id: 'usr_001', name: 'Bharath', uniqueNumber: 322,
      mobile: this.mobile, email: 'bharath@example.com', nickName: 'BK',
      role: dummyRole, isSeller: false,
      walletAmount: 1240, lockedAmount: 840, unlockedAmount: 400,
    });
    this.loading = false;
    this.router.navigate([`/${dummyRole}`], { replaceUrl: true });
  }

  async forgotPassword() {
    const alert = await this.alertCtrl.create({
      header: 'Forgot Password',
      message: 'Enter your registered mobile number to reset password.',
      inputs: [{ name: 'mobile', type: 'tel', placeholder: 'Mobile Number', attributes: { maxlength: 10 } }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send OTP',
          handler: async (data): Promise<boolean> => {
            if (!data.mobile || data.mobile.length < 10) {
              this.showToast('Enter valid 10-digit mobile number');
              return false;
            }
            // TODO: Supabase — send OTP for password reset
            this.showToast('OTP sent to +91 ' + data.mobile);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  goRegister() {
    this.router.navigate(['/register']);
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom' });
    t.present();
  }
}
