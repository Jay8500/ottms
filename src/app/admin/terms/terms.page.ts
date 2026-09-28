import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, ToastController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline, eyeOutline, createOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';

/** 18 — Terms & Conditions. Plain-text policy the user sees from their menu. */
@Component({
  selector: 'app-admin-terms',
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class AdminTermsPage implements OnInit {
  text = '';
  mode: 'edit' | 'preview' = 'edit';
  dirty = false;

  constructor(private data: DataService, private toastCtrl: ToastController) {
    addIcons({ saveOutline, eyeOutline, createOutline, shieldCheckmarkOutline });
  }

  async ngOnInit() {
    try {
      this.text = await this.data.getTerms();
    } catch (e) {
      this.toast(humanError(e, 'Could not load Terms & Conditions'));
    }
  }

  get lines() {
    return this.text.split('\n').filter(l => l.trim());
  }

  async save() {
    if (!this.text.trim()) { this.toast('Terms cannot be empty'); return; }
    try {
      await this.data.saveTerms(this.text);
      this.dirty = false;
      this.toast('Terms & Conditions saved');
    } catch (e) {
      this.toast(humanError(e, 'Could not save Terms & Conditions'));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom' });
    t.present();
  }
}