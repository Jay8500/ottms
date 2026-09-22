import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, trashOutline, addOutline, saveOutline,
  arrowUpOutline, arrowDownOutline, chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { QuickReply } from '../../shared/models';

/** Chat quick-reply buttons. Client sign-off: "put Quick reply customly i
 *  admin can create what User, seller or admin can use and put no of
 *  times usage count." Was five hardcoded strings in chat.page.ts. */
@Component({
  selector: 'app-admin-quickreplies',
  templateUrl: './quickreplies.page.html',
  styleUrls: ['./quickreplies.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class AdminQuickrepliesPage implements OnInit {
  items: QuickReply[] = [];
  dirty = false;

  readonly roles: { key: QuickReply['forRole']; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'user', label: 'Buyer' },
    { key: 'seller', label: 'Seller' }, { key: 'admin', label: 'Admin' },
  ];

  constructor(
    private data: DataService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, trashOutline, addOutline, saveOutline,
      arrowUpOutline, arrowDownOutline, chatbubbleEllipsesOutline,
    });
  }

  async ngOnInit() { this.items = await this.data.getQuickReplies(); }

  move(q: QuickReply, dir: -1 | 1) {
    const i = this.items.indexOf(q);
    const j = i + dir;
    if (j < 0 || j >= this.items.length) return;
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    this.items.forEach((x, n) => (x.position = n + 1));
    this.dirty = true;
  }

  setRole(q: QuickReply, role: QuickReply['forRole']) {
    q.forRole = role;
    this.dirty = true;
  }

  toggleActive(q: QuickReply) {
    q.active = !q.active;
    this.dirty = true;
  }

  onMaxUsesChange() { this.dirty = true; }

  async rename(q: QuickReply) {
    const alert = await this.alertCtrl.create({
      header: 'Edit quick reply',
      inputs: [{ name: 'text', type: 'text', value: q.text, placeholder: 'Message text' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (d) => {
            if (!d.text?.trim()) return false;
            q.text = d.text.trim();
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async remove(q: QuickReply) {
    const alert = await this.alertCtrl.create({
      header: 'Remove quick reply?',
      message: `"${q.text}" disappears from chat for whoever could see it.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove', role: 'destructive',
          handler: async () => {
            await this.data.deleteQuickReply(q.id);
            this.items = this.items.filter(x => x.id !== q.id);
            this.toast('Quick reply removed');
          },
        },
      ],
    });
    await alert.present();
  }

  async add() {
    const alert = await this.alertCtrl.create({
      header: 'Add quick reply',
      inputs: [{ name: 'text', type: 'text', placeholder: 'Message text e.g. Please share the code' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: (d) => {
            if (!d.text?.trim()) return false;
            this.items.push({
              id: this.data.newId('qr'), text: d.text.trim(), forRole: 'all',
              position: this.items.length + 1, active: true,
            });
            this.dirty = true;
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async save() {
    for (const q of this.items) await this.data.saveQuickReply(q);
    this.dirty = false;
    this.toast('Quick replies updated');
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom' });
    t.present();
  }
}
