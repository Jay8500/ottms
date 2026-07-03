import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline, lockOpenOutline, sendOutline,
  arrowBackOutline, ellipsisVerticalOutline, starOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon]
})
export class ChatPage implements OnInit {
  @ViewChild('scrollArea') scrollArea!: IonContent;

  peerName   = 'Rahul (104)';
  peerOnline = true;
  locked     = false;
  draft      = '';
  showRating = true;

  suggestedTexts = ['Credentials received ✅', 'Need help', 'Thank you!', 'Screen not working ❌', 'Payment done ✅'];

  messages: any[] = [
    { id:'1', text:'Hi! Ready to share your Netflix credentials?', isMine:false, time:'10:02 AM' },
    { id:'2', text:'Yes, payment is done. Please share.',          isMine:true,  time:'10:03 AM' },
    { id:'3', text:'Check your email for the profile invite link.',isMine:false, time:'10:04 AM' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController
  ) {
    addIcons({
      lockClosedOutline, lockOpenOutline, sendOutline,
      arrowBackOutline, ellipsisVerticalOutline, starOutline
    });
  }

  ngOnInit() {
    const name = this.route.snapshot.queryParamMap.get('peerName');
    if (name) this.peerName = name;
  }

  send() {
    if (!this.draft.trim()) return;
    this.messages.push({ id: Date.now().toString(), text: this.draft, isMine: true, time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) });
    this.draft = '';
    setTimeout(() => this.scrollArea?.scrollToBottom(200), 100);
  }

  sendSuggested(t: string) {
    this.messages.push({ id: Date.now().toString(), text: t, isMine: true, time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) });
    setTimeout(() => this.scrollArea?.scrollToBottom(200), 100);
  }

  toggleLock() { this.locked = !this.locked; }

  openRating() { this.router.navigate(['/user/rating']); }

  async openMore() {
    const alert = await this.alertCtrl.create({
      header: 'Options',
      buttons: [
        { text: 'View Profile', handler: () => {} },
        { text: 'Report User',  handler: () => {} },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await alert.present();
  }
}
