import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline, chevronForwardOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon]
})
export class SupportPage {
  faqLang = 'en';

  faqs = [
    { q:'How do I purchase a screen?',    a:'Go to Category → Select OTT → Choose Validity → Pick a Seller → Pay via UPI and upload screenshot.', open:false },
    { q:'When does my wallet unlock?',    a:'Your wallet unlocks proportionally each day over your screen validity period.', open:false },
    { q:'How do I withdraw money?',       a:'Go to Wallet tab → Tap Withdraw and follow the steps.', open:false },
    { q:'What if the seller is offline?', a:'You can still purchase. Credentials will be shared via in-app chat once the seller is online.', open:false },
    { q:'How do I become a seller?',      a:'Select an OTT app → Tap Share → Fill the Create Group form.', open:false },
    { q:'Is my payment secure?',          a:'Yes. All payments are screenshot-verified by our admin team before your wallet is credited.', open:false },
  ];

  constructor(private router: Router) {
    addIcons({ headsetOutline, chatbubblesOutline, logoWhatsapp, callOutline, chevronForwardOutline, chevronUpOutline, chevronDownOutline });
  }

  openInAppChat() { this.router.navigate(['/user/chat'], { queryParams: { mode: 'support' } }); }
  openInApp()     { /* TODO: Phase 2 */ }
  openWhatsApp()  { window.open('https://wa.me/919876500000?text=Hi%20I%20need%20help', '_system'); }
  callSupport()   { window.open('tel:+919876511111', '_system'); }
}
