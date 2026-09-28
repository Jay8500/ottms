import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent, IonIcon, IonFooter, AlertController, ToastController,
  IonRefresher, IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, addCircleOutline, pricetagOutline } from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { CmsEntity, Offer, OttApp } from '../../shared/models';
import { humanError } from '../../shared/errors';

/** New Offers — promotional posts on the user's home screen. Image,
 *  heading, description, and three prices (what it normally costs, what we
 *  charge, and the offer price), optionally linked to a platform already
 *  set up in Entertainment. */
@Component({
  selector: 'app-admin-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter,
    AdminHeaderComponent, EntityEditorComponent, IonRefresher, IonRefresherContent,
  ],
})
export class AdminOffersPage implements OnInit {
  items: Offer[] = [];
  apps: OttApp[] = [];
  editing: Offer | null = null;
  editorOpen = false;
  isNew = false;

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ createOutline, addCircleOutline, pricetagOutline });
  }

  async ngOnInit() {
    await this.load();
    if (this.route.snapshot.queryParamMap.get('new')) this.create();
  }

  private async load() {
    const [items, apps] = await Promise.all([
      this.data.getOffers(),
      this.data.getOttApps(),
    ]);
    this.items = items;
    this.apps = apps.filter(a => a.active);
  }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('offer'), title: '', color: '', icon: '',
      position: this.items.length + 1, active: true,
    };
    this.editorOpen = true;
  }

  edit(o: Offer) {
    this.isNew = false;
    this.editing = { ...o };
    this.editorOpen = true;
  }

  async onSave(e: CmsEntity) {
    const o = e as Offer;
    if (o.offerPrice != null && o.actualPrice != null && o.offerPrice > o.actualPrice) {
      this.toast('Offer price is higher than the actual price — check the numbers');
      return;
    }
    try {
      await this.data.saveOffer(o);
      await this.load();
      this.editorOpen = false;
      this.toast(this.isNew ? 'Offer added' : 'Offer updated');
    } catch (err) {
      this.toast(humanError(err, 'Could not save this offer'));
    }
  }

  async onRemove(id: string) {
    const o = this.items.find(x => x.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Remove offer?',
      message: `“${o?.title}” disappears from the home screen.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            try {
              await this.data.deleteOffer(id);
              await this.load();
              this.editorOpen = false;
              this.toast('Offer removed');
            } catch (err) {
              this.toast(humanError(err, 'Could not remove this offer'));
            }
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

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }
}
