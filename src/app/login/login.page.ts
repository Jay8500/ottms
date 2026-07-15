import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../auth';
import { IonContent, IonIcon, IonSpinner, ToastController, AlertController } from '@ionic/angular/standalone';
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

  private dummyUsers: any = {
    '0000000000': { id:'adm_001', name:'Admin',   nickName:'Admin', role:'admin', isSeller:false, uniqueNumber:1,   walletAmount:0,    lockedAmount:0,    unlockedAmount:0 },
    '1111111111': { id:'sel_001', name:'Meera',   nickName:'Meera', role:'user',  isSeller:true,  uniqueNumber:58,  walletAmount:3800, lockedAmount:1400, unlockedAmount:2400 },
    '9999999999': { id:'usr_001', name:'Bharath', nickName:'BK',    role:'user',  isSeller:false, uniqueNumber:322, walletAmount:1240, lockedAmount:840,  unlockedAmount:400 },
  };

  constructor(
    private auth: Auth,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ callOutline, lockClosedOutline, eyeOutline, eyeOffOutline });
  }

  ionViewDidEnter() {
    try { Keyboard.setAccessoryBarVisible({ isVisible: false }); } catch(e) {}
  }

  async login() {
    if (!this.mobile || !this.password) {
      this.showToast('Please enter mobile number and password'); return;
    }
    if (this.mobile.length < 10) {
      this.showToast('Enter valid 10-digit mobile number'); return;
    }
    this.loading = true;
    await new Promise((r) => setTimeout(r, 800));
    const dummy = this.dummyUsers[this.mobile] || {
      id: 'usr_' + Date.now(), name:'User', nickName:'User',
      role:'user', isSeller:false,
      uniqueNumber: Math.floor(Math.random()*900)+100,
      walletAmount:0, lockedAmount:0, unlockedAmount:0,
    };
    this.auth.setUser({ ...dummy, mobile: this.mobile, email: this.mobile+'@test.com' });
    this.loading = false;
    this.router.navigate([`/${dummy.role}`], { replaceUrl: true });
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
            this.showToast('OTP sent to +91 ' + data.mobile);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  goRegister() { this.router.navigate(['/register']); }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2500, position: 'bottom' });
    t.present();
  }
}
