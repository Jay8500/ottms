import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { Auth } from '../../auth';
import { addIcons } from 'ionicons';
import {
  cartOutline, shareSocialOutline, chevronForwardOutline,
  informationCircleOutline, peopleOutline, settingsOutline,
  optionsOutline, arrowBackOutline, cloudUploadOutline, addCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-accnttype',
  templateUrl: './accnttype.page.html',
  styleUrls: ['./accnttype.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon]
})
export class AccnttypePage implements OnInit {
  ottId = ''; ottName = ''; ottColor = '#1a73e8'; ottInitial = 'A'; isSeller = false;

  groupForm = {
    dateFrom: '',
    dateTo: '',
    plan: '',
    proofFile: '',
    comment: '',
  };

  private ottMap: any = {
    netflix: { name:'Netflix',  color:'#e50914', initial:'N' },
    prime:   { name:'Prime',    color:'#00a8e0', initial:'P' },
    hotstar: { name:'Hotstar',  color:'#1565c0', initial:'H' },
    sony:    { name:'SonyLIV', color:'#e91e63', initial:'S' },
    spotify: { name:'Spotify',  color:'#1db954', initial:'S' },
    zee5:    { name:'ZEE5',    color:'#8e24aa', initial:'Z' },
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private toastCtrl: ToastController
  ) {
    addIcons({
      cartOutline, shareSocialOutline, chevronForwardOutline,
      informationCircleOutline, peopleOutline, settingsOutline,
      optionsOutline, arrowBackOutline, cloudUploadOutline, addCircleOutline
    });
  }

  ngOnInit() {
    this.ottId = this.route.snapshot.queryParamMap.get('id') || 'netflix';
    const info = this.ottMap[this.ottId] || { name: this.ottId, color: '#1a73e8', initial: this.ottId[0]?.toUpperCase() || 'A' };
    this.ottName = info.name; this.ottColor = info.color; this.ottInitial = info.initial;
    this.isSeller = this.auth.isSeller;
  }

  navigate(action: 'purchase' | 'share') {
    this.router.navigate(['/user/validity'], { queryParams: { id: this.ottId, action } });
  }

  uploadProof() {
    // TODO: file picker
    this.groupForm.proofFile = 'screenshot.jpg';
  }

  async submitGroup() {
    if (!this.groupForm.dateFrom || !this.groupForm.dateTo || !this.groupForm.plan) {
      const t = await this.toastCtrl.create({ message: 'Please fill all required fields', duration: 2000, position: 'bottom' });
      t.present(); return;
    }
    // TODO: Supabase — submit group
    const t = await this.toastCtrl.create({ message: 'Group submitted for approval!', duration: 2000, position: 'bottom' });
    t.present();
    this.groupForm = { dateFrom: '', dateTo: '', plan: '', proofFile: '', comment: '' };
  }
}
