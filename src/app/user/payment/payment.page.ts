import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButton,IonButtons,IonBackButton } from '@ionic/angular/standalone';
import { Component, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
@Component({
  selector: 'app-payment',
  templateUrl: './payment.page.html',
  styleUrls: ['./payment.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon,IonButton,IonButtons,IonBackButton]
})
export class PaymentPage {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  screenshotFile: File | null = null;
 
  constructor(private router: Router, private toastCtrl: ToastController) {}
 
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
    // TODO: upload screenshot + notify admin via API
    // const formData = new FormData();
    // formData.append('screenshot', this.screenshotFile);
    // await this.http.post('/api/payments/submit', formData).toPromise();
    this.showToast('Payment submitted! Awaiting admin approval.');
    this.router.navigate(['/user/wallet']);
  }
 
  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2500, position: 'bottom' });
    t.present();
  }
}
 