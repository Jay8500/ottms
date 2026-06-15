import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonItem, IonInput, IonSelect, IonSelectOption,
  IonButton, IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { informationCircleOutline, cloudUploadOutline, checkmarkCircleOutline, sendOutline } from 'ionicons/icons';

@Component({
  selector: 'app-creategroup',
  templateUrl: './creategroup.page.html',
  styleUrls: ['./creategroup.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
    IonContent, IonItem, IonInput, IonSelect, IonSelectOption,
    IonButton, IonIcon
  ]
})
export class CreategroupPage {
  @ViewChild('proofInput') proofInput!: ElementRef<HTMLInputElement>;
  proofFile: File | null = null;

  form = { ottId:'', validity:'', plan:'', screenCount: null as any, price: null as any };

  ottApps = [
    { id:'netflix', name:'Netflix' }, { id:'prime',   name:'Prime Video' },
    { id:'hotstar', name:'Hotstar' }, { id:'sony',    name:'SonyLIV'     },
    { id:'spotify', name:'Spotify' }, { id:'zee5',    name:'ZEE5'        },
  ];

  constructor(private router: Router, private toastCtrl: ToastController) {
    addIcons({ informationCircleOutline, cloudUploadOutline, checkmarkCircleOutline, sendOutline });
  }

  uploadProof() { this.proofInput.nativeElement.click(); }

  onProofSelected(e: Event) {
    const f = (e.target as HTMLInputElement).files;
    if (f?.length) this.proofFile = f[0];
  }

  isFormValid() {
    return !!(this.form.ottId && this.form.validity && this.form.plan && this.form.screenCount && this.form.price && this.proofFile);
  }

  async submitGroup() {
    if (!this.isFormValid()) return;
    // TODO: upload proof + POST group to API
    const t = await this.toastCtrl.create({ message:'Group submitted for admin approval!', duration:2500, position:'bottom', color:'success' });
    t.present();
    this.router.navigate(['/user/home']);
  }
}
