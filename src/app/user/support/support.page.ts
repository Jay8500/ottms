import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline, chevronForwardOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon]
})
export class SupportPage {
  faqs = [
    { q:'How do I purchase a screen?',     a:'Go to Category → Select OTT → Choose Validity → Pick a Seller → Pay via UPI and upload screenshot.', open:false },
    { q:'When does my wallet unlock?',     a:'Your wallet unlocks proportionally each day over your screen validity period.', open:false },
    { q:'How do I withdraw money?',        a:'Go to Wallet tab → Tap "Withdraw Unlocked Amount" and follow the steps.', open:false },
    { q:'What if the seller is offline?',  a:'You can still purchase. Credentials will be shared via in-app chat once the seller is online.', open:false },
    { q:'How do I become a seller?',       a:'Enable Seller Mode on the Home page using the toggle. Then tap Create Group from the home screen.', open:false },
    { q:'Is my payment secure?',           a:'Yes. All payments are screenshot-verified by our admin team before your wallet is credited.', open:false },
  ];

  constructor() {
    addIcons({ headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline, chevronForwardOutline, chevronUpOutline, chevronDownOutline });
  }

  openInApp()    { /* TODO: navigate to support chat */ }
  openWhatsApp() { window.open('https://wa.me/919876500000?text=Hi%20I%20need%20help', '_system'); }
  callSupport()  { window.open('tel:+919876511111', '_system'); }
}
