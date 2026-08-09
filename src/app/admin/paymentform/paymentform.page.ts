import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, cloudUploadOutline, createOutline, saveOutline,
  businessOutline, helpCircleOutline, closeOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { PaymentConfig } from '../../shared/models';

/** 13 — Payment Form. The UPI details and QR code shown to users on the
 *  Make Payment screen when they add funds. */
@Component({
  selector: 'app-admin-paymentform',
  templateUrl: './paymentform.page.html',
  styleUrls: ['./paymentform.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class AdminPaymentformPage implements OnInit {
  cfg: PaymentConfig = {
    name: '', upiId: '', upiMobile: '', bankName: '', bankMasked: '',
  };
  dirty = false;

  constructor(private data: DataService, private toastCtrl: ToastController) {
    addIcons({
      qrCodeOutline, cloudUploadOutline, createOutline, saveOutline,
      businessOutline, helpCircleOutline, closeOutline,
    });
  }

  async ngOnInit() { this.cfg = await this.data.getPaymentConfig(); }

  onQr(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.toast('QR image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { this.cfg.qrImageUrl = reader.result as string; this.dirty = true; };
    reader.readAsDataURL(file);
  }

  clearQr() { this.cfg.qrImageUrl = undefined; this.dirty = true; }

  async save() {
    if (!this.cfg.upiId.trim()) { this.toast('A UPI ID is required — users pay into it'); return; }
    if (!this.cfg.upiId.includes('@')) { this.toast('That does not look like a UPI ID (name@bank)'); return; }
    if (!this.cfg.name.trim()) { this.toast('Enter the account holder name'); return; }

    await this.data.savePaymentConfig(this.cfg);
    this.dirty = false;
    this.toast('Payment details saved — users see these immediately');
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    t.present();
  }
}