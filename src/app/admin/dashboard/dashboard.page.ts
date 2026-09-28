import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ActionSheetController, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  menuOutline, optionsOutline, searchOutline, addCircleOutline,
  personAddOutline, homeOutline, gridOutline, filmOutline, cartOutline,
  calendarOutline, idCardOutline, peopleOutline, walletOutline,
  swapHorizontalOutline, cardOutline, chatbubblesOutline, documentTextOutline,
  headsetOutline, starOutline, peopleCircleOutline, shareSocialOutline,
  shieldCheckmarkOutline, logOutOutline, notificationsOutline, pricetagOutline,
  chatbubbleEllipsesOutline,
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
  imports: [CommonModule, FormsModule, IonContent, IonIcon, AdminHeaderComponent, IonRefresher, IonRefresherContent],
})
export class DashboardPage implements OnInit {
  term = '';

  features: Feature[] = [
    { n: 1,  label: 'Create Account/Group', icon: 'person-add-outline',      tint: '#2563EB', accent: '#38BDF8', route: '/admin/formbuilder' },
    { n: 2,  label: 'Home',                 icon: 'home-outline',            tint: '#2563EB', accent: '#22C55E', route: '/admin/homemgnmt' },
    { n: 3,  label: 'Categories',           icon: 'grid-outline',            tint: '#8B5CF6', accent: '#F97316', route: '/admin/categorymngmnt' },
    { n: 4,  label: 'Entertainment',        icon: 'film-outline',            tint: '#F97316', accent: '#F97316', route: '/admin/entertainment' },
    // Same screen as Entertainment (OTT + plans + instructions), surfaced
    // under the name the client asked for: "select the OTT and Add Plans,
    // Validities, and Instructions ... reflected in the Normal App for
    // users to Create Groups." Validity stays a separate card below —
    // merging the two into one screen is a bigger change than a shortcut.
    { n: 5,  label: 'Create Groups',        icon: 'add-circle-outline',      tint: '#16A34A', accent: '#16A34A', route: '/admin/entertainment' },
    { n: 6,  label: 'Commerce',             icon: 'cart-outline',            tint: '#8B5CF6', accent: '#8B5CF6', route: '/admin/commerce' },
    { n: 7,  label: 'Validity',             icon: 'calendar-outline',        tint: '#2563EB', accent: '#F9D54B', route: '/admin/validity' },
    { n: 8,  label: "User's Data",          icon: 'id-card-outline',         tint: '#2563EB', accent: '#2563EB', route: '/admin/usermngmnt' },
    { n: 9,  label: "Group's",              icon: 'people-outline',          tint: '#22C55E', accent: '#22C55E', route: '/admin/groupapprovals' },
    { n: 10, label: 'Wallet',               icon: 'wallet-outline',          tint: '#2563EB', accent: '#F9D54B', route: '/admin/walletadmin' },
    { n: 11, label: 'Transections',         icon: 'swap-horizontal-outline', tint: '#8B5CF6', accent: '#EC4899', route: '/admin/transactions' },
    { n: 12, label: "Payment's",            icon: 'card-outline',            tint: '#8B5CF6', accent: '#EC4899', route: '/admin/paymentaprpovals' },
    { n: 13, label: "Chat's",               icon: 'chatbubbles-outline',     tint: '#2563EB', accent: '#38BDF8', route: '/admin/chats' },
    { n: 14, label: 'Payment Form',         icon: 'document-text-outline',   tint: '#8B5CF6', accent: '#8B5CF6', route: '/admin/paymentform' },
    { n: 15, label: 'Support',              icon: 'headset-outline',         tint: '#2563EB', accent: '#38BDF8', route: '/admin/cntnorspptmngmnt' },
    { n: 16, label: 'Ratings',              icon: 'star-outline',            tint: '#EAB308', accent: '#F9D54B', route: '/admin/ratings' },
    { n: 17, label: 'Follow Us',            icon: 'people-circle-outline',   tint: '#F97316', accent: '#F97316', route: '/admin/followus' },
    { n: 18, label: 'Refer Friends',        icon: 'share-social-outline',    tint: '#22C55E', accent: '#22C55E', route: '/admin/refer' },
    { n: 19, label: 'Terms & Conditions',   icon: 'shield-checkmark-outline',tint: '#2563EB', accent: '#2563EB', route: '/admin/terms' },
    { n: 20, label: 'Notifications',        icon: 'notifications-outline',   tint: '#EC4899', accent: '#EC4899', route: '/admin/notifications' },
    { n: 21, label: 'New Offers',           icon: 'pricetag-outline',        tint: '#DC2626', accent: '#DC2626', route: '/admin/offers' },
    { n: 22, label: 'Quick Replies',        icon: 'chatbubble-ellipses-outline', tint: '#2563EB', accent: '#38BDF8', route: '/admin/quickreplies' },
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
      shieldCheckmarkOutline, logOutOutline, notificationsOutline, pricetagOutline,
      chatbubbleEllipsesOutline,
    });
  }

  stats = {
    totalUsers: 0, activeSellers: 0, activeScreens: 0,
    pendingGroups: 0, pendingPayments: 0, revenue: 0,
  };
  statsLoading = true;

  async ngOnInit() { await this.loadStats(); }

  private async loadStats() {
    this.statsLoading = true;
    try {
      this.stats = await this.data.getDashboardStats();
      this.badge("Group's", this.stats.pendingGroups);
      this.badge("Payment's", this.stats.pendingPayments);
    } catch (e) {
      console.error('Dashboard stats failed', e);
    } finally {
      this.statsLoading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.loadStats();
    (ev.target as HTMLIonRefresherElement).complete();
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
    // A failed signOut() (e.g. a network drop at that exact moment) must
    // not leave the admin stuck looking signed-in with nothing to do —
    // the local session is cleared and they land on login either way.
    try {
      await this.auth.logout();
    } catch (e) {
      console.error('Logout failed', e);
    }
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}