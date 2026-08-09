import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ActionSheetController, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline, optionsOutline, searchOutline, addCircleOutline,
  personAddOutline, homeOutline, gridOutline, filmOutline, cartOutline,
  calendarOutline, idCardOutline, peopleOutline, walletOutline,
  swapHorizontalOutline, cardOutline, chatbubblesOutline, documentTextOutline,
  headsetOutline, starOutline, peopleCircleOutline, shareSocialOutline,
  shieldCheckmarkOutline, logOutOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { DataService } from '../../shared/data.service';
import { Auth } from '../../auth';

interface Feature {
  n: number;
  label: string;
  icon: string;
  tint: string;    // icon colour
  accent: string;  // underline colour
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonFooter],
})
export class DashboardPage implements OnInit {
  term = '';

  features: Feature[] = [
    { n: 1,  label: 'Create Account/Group', icon: 'person-add-outline',      tint: '#2563EB', accent: '#38BDF8', route: '/admin/formbuilder' },
    { n: 2,  label: 'Home',                 icon: 'home-outline',            tint: '#2563EB', accent: '#22C55E', route: '/admin/homemgnmt' },
    { n: 3,  label: 'Categories',           icon: 'grid-outline',            tint: '#8B5CF6', accent: '#F97316', route: '/admin/categorymngmnt' },
    { n: 4,  label: 'Entertainment',        icon: 'film-outline',            tint: '#F97316', accent: '#F97316', route: '/admin/entertainment' },
    { n: 5,  label: 'Commerce',             icon: 'cart-outline',            tint: '#8B5CF6', accent: '#8B5CF6', route: '/admin/commerce' },
    { n: 6,  label: 'Validity',             icon: 'calendar-outline',        tint: '#2563EB', accent: '#F9D54B', route: '/admin/validity' },
    { n: 7,  label: "User's Data",          icon: 'id-card-outline',         tint: '#2563EB', accent: '#2563EB', route: '/admin/usermngmnt' },
    { n: 8,  label: "Group's",              icon: 'people-outline',          tint: '#22C55E', accent: '#22C55E', route: '/admin/groupapprovals' },
    { n: 9,  label: 'Wallet',               icon: 'wallet-outline',          tint: '#2563EB', accent: '#F9D54B', route: '/admin/walletadmin' },
    { n: 10, label: 'Transections',         icon: 'swap-horizontal-outline', tint: '#8B5CF6', accent: '#EC4899', route: '/admin/transactions' },
    { n: 11, label: "Payment's",            icon: 'card-outline',            tint: '#8B5CF6', accent: '#EC4899', route: '/admin/paymentaprpovals' },
    { n: 12, label: "Chat's",               icon: 'chatbubbles-outline',     tint: '#2563EB', accent: '#38BDF8', route: '/admin/chats' },
    { n: 13, label: 'Payment Form',         icon: 'document-text-outline',   tint: '#8B5CF6', accent: '#8B5CF6', route: '/admin/paymentform' },
    { n: 14, label: 'Support',              icon: 'headset-outline',         tint: '#2563EB', accent: '#38BDF8', route: '/admin/cntnorspptmngmnt' },
    { n: 15, label: 'Ratings',              icon: 'star-outline',            tint: '#EAB308', accent: '#F9D54B', route: '/admin/ratings' },
    { n: 16, label: 'Follow Us',            icon: 'people-circle-outline',   tint: '#F97316', accent: '#F97316', route: '/admin/followus' },
    { n: 17, label: 'Refer Friends',        icon: 'share-social-outline',    tint: '#22C55E', accent: '#22C55E', route: '/admin/refer' },
    { n: 18, label: 'Terms & Conditions',   icon: 'shield-checkmark-outline',tint: '#2563EB', accent: '#2563EB', route: '/admin/terms' },
  ];

  filtered: Feature[] = [...this.features];

  constructor(
    private router: Router,
    private data: DataService,
    private auth: Auth,
    private sheetCtrl: ActionSheetController,
  ) {
    addIcons({
      menuOutline, optionsOutline, searchOutline, addCircleOutline,
      personAddOutline, homeOutline, gridOutline, filmOutline, cartOutline,
      calendarOutline, idCardOutline, peopleOutline, walletOutline,
      swapHorizontalOutline, cardOutline, chatbubblesOutline, documentTextOutline,
      headsetOutline, starOutline, peopleCircleOutline, shareSocialOutline,
      shieldCheckmarkOutline, logOutOutline,
    });
  }

  async ngOnInit() {
    const s = await this.data.getDashboardStats();
    this.badge("Group's", s.pendingGroups);
    this.badge("Payment's", s.pendingPayments);
  }

  private badge(label: string, count: number) {
    const f = this.features.find(x => x.label === label);
    if (f) f.badge = count || undefined;
  }

  filter() {
    const t = this.term.trim().toLowerCase();
    this.filtered = !t ? [...this.features] : this.features.filter(f => f.label.toLowerCase().includes(t));
  }

  open(f: Feature) { this.router.navigate([f.route]); }

  async openMenu() {
    const sheet = await this.sheetCtrl.create({
      header: 'Admin',
      buttons: [
        { text: 'Dashboard',   handler: () => { this.router.navigate(['/admin/dashboard']); } },
        { text: "User's Data", handler: () => { this.router.navigate(['/admin/usermngmnt']); } },
        { text: 'Terms & Conditions', handler: () => { this.router.navigate(['/admin/terms']); } },
        { text: 'Logout', role: 'destructive', handler: () => { this.logout(); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  /** "Add New" is context-free on the dashboard, so it offers the create-capable screens. */
  async addNew() {
    const sheet = await this.sheetCtrl.create({
      header: 'Add New',
      buttons: [
        { text: 'Category',       handler: () => { this.router.navigate(['/admin/categorymngmnt'], { queryParams: { new: 1 } }); } },
        { text: 'OTT Platform',   handler: () => { this.router.navigate(['/admin/entertainment'],  { queryParams: { new: 1 } }); } },
        { text: 'Validity Plan',  handler: () => { this.router.navigate(['/admin/validity'],       { queryParams: { new: 1 } }); } },
        { text: 'Home Button',    handler: () => { this.router.navigate(['/admin/homemgnmt'],      { queryParams: { new: 1 } }); } },
        { text: 'FAQ',            handler: () => { this.router.navigate(['/admin/cntnorspptmngmnt'], { queryParams: { new: 1 } }); } },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}