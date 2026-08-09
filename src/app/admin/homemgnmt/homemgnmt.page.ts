import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, IonFooter, AlertController, ToastController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, addCircleOutline, headsetOutline, pricetagOutline,
  helpCircleOutline, chatbubblesOutline, giftOutline, cartOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { CmsEntity, HomeButton } from '../../shared/models';

/** 2 — Home. The action buttons on the user's home screen: name, colour,
 *  icon, and which side the icon sits on. */
@Component({
  selector: 'app-homemgnmt',
  templateUrl: './homemgnmt.page.html',
  styleUrls: ['./homemgnmt.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon, IonFooter,
    AdminHeaderComponent, EntityEditorComponent, IonRefresher, IonRefresherContent
  ],
})
export class HomemgnmtPage implements OnInit {
  items: HomeButton[] = [];
  editing: HomeButton | null = null;
  editorOpen = false;
  isNew = false;

  readonly icons = [
    'headset-outline', 'pricetag-outline', 'help-circle-outline',
    'chatbubbles-outline', 'gift-outline', 'cart-outline',
  ];

  readonly routes = [
    { label: 'Support',    value: '/user/support' },
    { label: 'Categories', value: '/user/category' },
    { label: 'Wallet',     value: '/user/wallet' },
    { label: 'Chats',      value: '/user/chat' },
  ];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, addCircleOutline, headsetOutline, pricetagOutline,
      helpCircleOutline, chatbubblesOutline, giftOutline, cartOutline,
    });
  }

  async ngOnInit() {
    await this.load();
    if (this.route.snapshot.queryParamMap.get('new')) this.create();
  }

  private async load() { this.items = await this.data.getHomeButtons(); }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('hb'), title: '', color: '#F9D54B',
      icon: 'headset-outline', iconPosition: 'left', route: '/user/support',
      position: this.items.length + 1, active: true,
    };
    this.editorOpen = true;
  }

  edit(b: HomeButton) {
    this.isNew = false;
    this.editing = { ...b };
    this.editorOpen = true;
  }

  async onSave(e: CmsEntity) {
    await this.data.saveHomeButton(e as HomeButton);
    await this.load();
    this.editorOpen = false;
    this.toast(this.isNew ? 'Button added' : 'Button updated');
  }

  async onRemove(id: string) {
    const b = this.items.find(x => x.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Remove button?',
      message: `“${b?.title}” disappears from the home screen.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            await this.data.deleteHomeButton(id);
            await this.load();
            this.editorOpen = false;
            this.toast('Button removed');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}