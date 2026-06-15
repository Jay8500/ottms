import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar, IonIcon,
  IonButton, IonButtons, IonBackButton, ToastController
} from '@ionic/angular/standalone';
import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { qrCodeOutline, copyOutline, cloudUploadOutline, checkmarkCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule,
    FormsModule, IonIcon, IonButton, IonButtons, IonBackButton
  ]
})
export class PaymentPage {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  screenshotFile: File | null = null;

  constructor(private router: Router, private toastCtrl: ToastController) {
    addIcons({ qrCodeOutline, copyOutline, cloudUploadOutline, checkmarkCircleOutline });
  }

  uploadScreenshot() { this.fileInput.nativeElement.click(); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.screenshotFile = input.files[0];
  }

  copyUpi() {
    navigator.clipboard.writeText('moneysaver@upi');
    this.showToast('UPI ID copied!');
  }

  async submitPayment() {
    if (!this.screenshotFile) return;
    this.showToast('Payment submitted! Awaiting admin approval.');
    this.router.navigate(['/user/wallet']);
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2500, position: 'bottom' });
    t.present();
  }
}
