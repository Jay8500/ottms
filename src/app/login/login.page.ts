// src/app/login/login.page.ts
import { Component } from '@angular/core';
import { IonCard, IonicModule, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, RouterModule, CommonModule],
})
export class LoginPage {
  credentials = { email: null, password: null };
  showPassword = false;
  loading = false;
  constructor(private router: Router, private loadingCtrl: LoadingController) {}
  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async onLogin() {
    if (!this.credentials.email || !this.credentials.password) return;
    this.loading = true;
    const loading = await this.loadingCtrl.create({
      message: 'Verifying credentials',
      duration: 0,
    });
    loading.present();
    setTimeout(async () => {
      this.loading = false;
      await loading.dismiss();
      this.router.navigate(['/tabs']);
    }, 1500);
  }
}
