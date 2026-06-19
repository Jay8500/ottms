import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonFooter, IonInput, IonIcon, IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { lockClosedOutline, lockOpenOutline, informationCircleOutline, closeOutline, imageOutline, sendOutline } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
   
    IonContent,  IonIcon
  ]
})
export class ChatPage implements OnInit {
  @ViewChild('scrollArea') scrollArea!: IonContent;

  peerName   = 'Rahul (104)';
  peerOnline = true;
  locked     = false;
  showBanner = true;
  draft      = '';

  suggestedTexts = ['Credentials received ✅', 'Need help', 'Thank you!', 'Screen not working ❌', 'Payment done ✅'];

  messages: any[] = [
    { id:'1', text:'Hi! Ready to share your Netflix credentials?', isMine:false, time:'10:02 AM' },
    { id:'2', text:'Yes, payment is done. Please share.',          isMine:true,  time:'10:03 AM' },
    { id:'3', text:'Check your email for the profile invite link.',isMine:false, time:'10:04 AM' },
  ];

  constructor(private route: ActivatedRoute) {
    addIcons({ lockClosedOutline, lockOpenOutline, informationCircleOutline, closeOutline, imageOutline, sendOutline });
  }

  ngOnInit() { /* TODO: load real messages from API */ }

  send() {
    const text = this.draft.trim();
    if (!text || this.locked) return;
    this.messages.push({
      id: Date.now().toString(), text, isMine: true,
      time: new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    });
    this.draft = '';
    setTimeout(() => this.scrollArea?.scrollToBottom(200), 50);
  }

  sendSuggested(text: string) { this.draft = text; this.send(); }
  toggleLock() { this.locked = !this.locked; }
  attachImage() { /* TODO: Capacitor file picker */ }
}
