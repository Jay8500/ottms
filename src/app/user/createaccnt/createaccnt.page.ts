import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonItem, IonInput, IonIcon, IonButton, IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { tvOutline, cameraOutline, personOutline, callOutline, mailOutline, happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-createaccnt',
  templateUrl: './createaccnt.page.html',
  styleUrls: ['./createaccnt.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonItem, IonInput, IonIcon, IonButton, IonSpinner]
})
export class CreateaccntPage {
  @ViewChild('avatarInput') avatarInput!: ElementRef<HTMLInputElement>;
  showPwd = false; loading = false;
  avatarPreview: string | null = null;
  previewId = Math.floor(100 + Math.random() * 900);
  form = { name:'', mobile:'', email:'', nickName:'', password:'' };

  constructor(private router: Router, private toastCtrl: ToastController) {
    addIcons({ tvOutline, cameraOutline, personOutline, callOutline, mailOutline, happyOutline, lockClosedOutline, eyeOutline, eyeOffOutline, idCardOutline });
  }

  pickAvatar() { this.avatarInput.nativeElement.click(); }

  onAvatarSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  isValid() {
    return !!(this.form.name.trim() && this.form.mobile.length === 10 && this.form.email.includes('@') && this.form.password.length >= 6);
  }

  async createAccount() {
    if (!this.isValid()) return;
    this.loading = true;
    await new Promise(r => setTimeout(r, 1000)); // TODO: replace with API
    this.loading = false;
    const t = await this.toastCtrl.create({ message:`Account created! Welcome, ${this.form.name.split(' ')[0]} (${this.previewId})`, duration:2500, position:'bottom', color:'success' });
    await t.present();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  goLogin() { this.router.navigate(['/login']); }
}
