import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, addCircleOutline, calendarOutline, eyeOffOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { CmsEntity, ValidityPlan } from '../../shared/models';

/** 6 — Validity. The 1/3/6/12-month plans, their price and the saving shown to buyers. */
@Component({
  selector: 'app-admin-validity',
  templateUrl: './validity.page.html',
  styleUrls: ['./validity.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, EntityEditorComponent, IonFooter, IonRefresher, IonRefresherContent],
})
export class AdminValidityPage implements OnInit {
  items: ValidityPlan[] = [];
  editing: ValidityPlan | null = null;
  editorOpen = false;
  isNew = false;

  readonly icons = ['calendar-outline', 'time-outline', 'pricetag-outline'];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ createOutline, addCircleOutline, calendarOutline, eyeOffOutline });
  }

  async ngOnInit() {
    await this.load();
    if (this.route.snapshot.queryParamMap.get('new')) this.create();
  }

  private async load() { this.items = await this.data.getValidityPlans(); }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('val'), title: '', subName: '',
      color: '#F9D54B', icon: 'calendar-outline',
      months: 1, amount: 0, saveUpto: 0,
      position: this.items.length + 1, active: true,
    };
    this.editorOpen = true;
  }

  edit(v: ValidityPlan) {
    this.isNew = false;
    this.editing = { ...v };
    this.editorOpen = true;
  }

  async onSave(e: CmsEntity) {
    const v = e as ValidityPlan;
    if (v.months < 1)  { this.toast('Duration must be at least 1 month'); return; }
    if (v.amount <= 0) { this.toast('Enter a price above zero'); return; }
    await this.data.saveValidityPlan(v);
    await this.load();
    this.editorOpen = false;
    this.toast(this.isNew ? 'Plan created' : 'Plan updated');
  }

  async onRemove(id: string) {
    const v = this.items.find(x => x.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Delete plan?',
      message: `${v?.title} will no longer be offered. Active subscriptions on this plan keep running to their end date.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.data.deleteValidityPlan(id);
            await this.load();
            this.editorOpen = false;
            this.toast('Plan deleted');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}