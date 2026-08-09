import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, addCircleOutline, cartOutline, peopleOutline,
  shareSocialOutline, calendarOutline, tvOutline, eyeOffOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { CmsEntity, CommerceOption } from '../../shared/models';

/** 5 — Commerce. The Purchase / Share cards a user sees after picking a
 *  platform, and the shortcut through to the validity plans. */
@Component({
  selector: 'app-admin-commerce',
  templateUrl: './commerce.page.html',
  styleUrls: ['./commerce.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, EntityEditorComponent, IonFooter, IonRefresher, IonRefresherContent],
})
export class AdminCommercePage implements OnInit {
  items: CommerceOption[] = [];
  editing: CommerceOption | null = null;
  editorOpen = false;
  isNew = false;

  readonly icons = [
    'cart-outline', 'people-outline', 'share-social-outline',
    'tv-outline', 'calendar-outline',
  ];

  constructor(
    private data: DataService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, addCircleOutline, cartOutline, peopleOutline,
      shareSocialOutline, calendarOutline, tvOutline, eyeOffOutline,
    });
  }

  async ngOnInit() { await this.load(); }

  private async load() { this.items = await this.data.getCommerceOptions(); }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('co'), title: '', subName: '',
      action: 'purchase', color: '#F9D54B', icon: 'cart-outline',
      position: this.items.length + 1, active: true,
    };
    this.editorOpen = true;
  }

  edit(c: CommerceOption) {
    this.isNew = false;
    this.editing = { ...c };
    this.editorOpen = true;
  }

  goValidity() { this.router.navigate(['/admin/validity']); }

  async onSave(e: CmsEntity) {
    await this.data.saveCommerceOption(e as CommerceOption);
    await this.load();
    this.editorOpen = false;
    this.toast(this.isNew ? 'Option added' : 'Option updated');
  }

  async onRemove(id: string) {
    const c = this.items.find(x => x.id === id);
    const remaining = this.items.filter(x => x.id !== id && x.active);
    if (!remaining.length) {
      this.toast('At least one option must remain — users need a way to continue');
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Remove option?',
      message: `“${c?.title}” disappears from the screen users see after picking a platform.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            await this.data.deleteCommerceOption(id);
            await this.load();
            this.editorOpen = false;
            this.toast('Option removed');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}