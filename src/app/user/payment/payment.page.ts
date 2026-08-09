import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  qrCodeOutline, copyOutline, cloudUploadOutline, sendOutline,
  arrowBackOutline, helpCircleOutline, checkmarkCircle, businessOutline,
} from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { NetworkService } from '../../shared/network.service';
import { humanError } from '../../shared/errors';
import { PaymentConfig } from '../../shared/models';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon],
})
export class PaymentPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  cfg: PaymentConfig | null = null;
  loading = true;
  error = '';

  amount: number | null = null;
  txnRef = '';
  paymentApp = '';
  screenshot: File | null = null;
  submitting = false;

  readonly apps = ['PhonePe', 'GPay', 'Paytm', 'Bank'];

  constructor(
    private router: Router,
    private data: DataService,
    public net: NetworkService,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      qrCodeOutline, copyOutline, cloudUploadOutline, sendOutline,
      arrowBackOutline, helpCircleOutline, checkmarkCircle, businessOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.cfg = await this.data.getPaymentConfig();
    } catch (e) {
      this.error = 'Could not load payment details.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  back() { this.router.navigate(['/user/wallet']); }

  async copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.toast(`${label} copied`);
    } catch {
      this.toast('Could not copy — long-press to select instead');
    }
  }

  pickFile() { this.fileInput.nativeElement.click(); }

  onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { this.toast('File must be under 5MB'); return; }
    this.screenshot = file;
  }

  get canSubmit() {
    return !!this.amount && this.amount > 0 && !!this.screenshot && !this.submitting;
  }

  async submit() {
    if (!this.net.canTransact) { this.toast('You are offline — payments are paused'); return; }
    if (!this.amount || this.amount <= 0) { this.toast('Enter the amount you paid'); return; }
    if (!this.screenshot) { this.toast('Upload your payment screenshot'); return; }

    this.submitting = true;
    try {
      await this.data.requestAddFund({
        amount: this.amount,
        paymentApp: this.paymentApp || undefined,
        txnRef: this.txnRef || undefined,
        screenshot: this.screenshot,
      });
      this.toast('Sent. Your wallet is credited once admin approves.');
      this.router.navigate(['/user/wallet']);
    } catch (e: any) {
      this.toast(humanError(e, 'Could not send the request'));
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2800, position: 'bottom' });
    t.present();
  }
}