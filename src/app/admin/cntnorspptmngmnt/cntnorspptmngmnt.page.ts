import { Component } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
 import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButton,IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-cntnorspptmngmnt',
  templateUrl: './cntnorspptmngmnt.page.html',
  styleUrls: ['./cntnorspptmngmnt.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon,IonButton,IonLabel]
})
export class CntnorspptmngmntPage {
 
  contacts = { email: 'support@moneysaver.in', whatsapp: '+91 98765 00000', phone: '+91 98765 11111' };
 
  faqs = [
    { id:'f1', question:'How to purchase a screen?',    answer:'Category → OTT → Validity → Seller → Pay'              },
    { id:'f2', question:'When does wallet unlock?',     answer:'Proportionally daily over your validity period'         },
    { id:'f3', question:'How to withdraw?',             answer:'Wallet tab → Withdraw Unlocked Amount'                  },
    { id:'f4', question:'What if seller is offline?',   answer:'Purchase anyway; credentials shared once seller online' },
  ];
 
  suggestedTexts = [
    { id:'s1', text:'Credentials received ✅' },
    { id:'s2', text:'Need help'              },
    { id:'s3', text:'Thank you!'             },
    { id:'s4', text:'Screen not working'     },
    { id:'s5', text:'Payment done'           },
  ];
 
  constructor(private alertCtrl: AlertController, private toastCtrl: ToastController) {}
 
  async saveContacts() {
    // TODO: API call
    const t = await this.toastCtrl.create({ message: 'Contact details saved!', duration: 2000, position: 'bottom', color: 'success' });
    t.present();
  }
 
  async addFaq() {
    const alert = await this.alertCtrl.create({
      header: 'Add FAQ',
      inputs: [
        { name: 'question', type: 'text',     placeholder: 'Question'     },
        { name: 'answer',   type: 'textarea', placeholder: 'Answer'       },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: data => { this.faqs.push({ id: Date.now().toString(), ...data }); /* TODO: API */ } },
      ],
    });
    await alert.present();
  }
 
  async editFaq(faq: any) {
    const alert = await this.alertCtrl.create({
      header: 'Edit FAQ',
      inputs: [
        { name: 'question', type: 'text',     value: faq.question },
        { name: 'answer',   type: 'textarea', value: faq.answer   },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', handler: data => { faq.question = data.question; faq.answer = data.answer; /* TODO: API */ } },
      ],
    });
    await alert.present();
  }
 
  deleteFaq(faq: any) { this.faqs = this.faqs.filter(f => f.id !== faq.id); /* TODO: API */ }
 
  async addSuggested() {
    const alert = await this.alertCtrl.create({
      header: 'Add Suggested Text',
      inputs: [{ name: 'text', type: 'text', placeholder: 'e.g. Credentials received ✅' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: data => { this.suggestedTexts.push({ id: Date.now().toString(), text: data.text }); } },
      ],
    });
    await alert.present();
  }
 
  deleteSuggested(s: any) { this.suggestedTexts = this.suggestedTexts.filter(x => x.id !== s.id); }
}