import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonTextarea, IonButton, ToastController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-rating',
  templateUrl: './rating.page.html',
  styleUrls: ['./rating.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, 
  ]
})
export class RatingPage implements OnInit {
  peerName = 'Rahul (104)'; ottName = 'Netflix'; validity = '1 Month';
  selected = 0; review = ''; activeBadges: string[] = [];
  labels = ['Poor','Fair','Good','Very Good','Excellent'];
  badges = [
    { key:'fast',     emoji:'⚡', label:'Fast Response' },
    { key:'trust',    emoji:'✅', label:'Trustworthy'   },
    { key:'accurate', emoji:'🎯', label:'Accurate'      },
    { key:'helpful',  emoji:'🤝', label:'Helpful'       },
    { key:'price',    emoji:'💰', label:'Good Price'    },
  ];

  constructor(private route: ActivatedRoute, private router: Router, private toastCtrl: ToastController) {}

  ngOnInit() { /* TODO: load from queryParams */ }

  toggleBadge(key: string) {
    const idx = this.activeBadges.indexOf(key);
    idx > -1 ? this.activeBadges.splice(idx,1) : this.activeBadges.push(key);
  }

  async submit() {
    if (!this.selected) return;
    const t = await this.toastCtrl.create({ message:'Rating submitted! Thank you 🙏', duration:2200, position:'bottom', color:'success' });
    await t.present();
    this.router.navigate(['/user/wallet']);
  }

  skip() { this.router.navigate(['/user/wallet']); }
}
