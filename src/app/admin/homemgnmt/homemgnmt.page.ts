import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
  import {
  IonContent,
  IonItem,
  IonInput,
  IonIcon,
  IonButton,
  ToastController,
  LoadingController,
  IonSpinner,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonBadge
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-homemgnmt',
  templateUrl: './homemgnmt.page.html',
  styleUrls: ['./homemgnmt.page.scss'],
  standalone: true,
  imports: [ CommonModule, FormsModule,IonContent,IonIcon,IonHeader,IonToolbar,
    IonButton,IonButtons,IonTitle,IonBadge
  ]
})
export class HomemgnmtPage  {
  stats = [
    { icon: 'people-outline',      color: '#1a73e8', value: '1,284', label: 'Total Users'     },
    { icon: 'storefront-outline',  color: '#2e7d32', value: '147',   label: 'Active Sellers'  },
    { icon: 'tv-outline',          color: '#e65100', value: '843',   label: 'Active Screens'  },
    { icon: 'cash-outline',        color: '#6a1b9a', value: '₹2.4L', label: 'Total Revenue'   },
  ];
 
  actions = [
    { icon: 'image-outline',      label: 'Edit Banner',    action: () => {} },
    { icon: 'apps-outline',       label: 'Add OTT App',    action: () => this.navigate('categories') },
    { icon: 'text-outline',       label: 'Edit Text',      action: () => {} },
    { icon: 'add-circle-outline', label: 'Add Section',    action: () => {} },
    { icon: 'settings-outline',   label: 'Settings',       action: () => this.navigate('content') },
  ];
 
  navItems = [
    { route: 'users',             icon: 'people-outline',          label: 'User Management',     desc: 'View, edit, delete users',          bg: '#e8f0fe', color: '#1a73e8', badge: null },
    { route: 'group-approvals',   icon: 'shield-checkmark-outline', label: 'Group Approvals',    desc: 'Approve / reject seller groups',    bg: '#e8f5e9', color: '#2e7d32', badge: 3    },
    { route: 'payment-approvals', icon: 'card-outline',            label: 'Payment Approvals',   desc: 'Verify and approve payments',       bg: '#fff8e1', color: '#e65100', badge: 12   },
    { route: 'wallet',            icon: 'wallet-outline',          label: 'Wallet Admin',        desc: 'Manage all user wallets',           bg: '#f3e5f5', color: '#6a1b9a', badge: null },
    { route: 'categories',        icon: 'grid-outline',            label: 'Category Management', desc: 'Add, edit, delete OTT categories', bg: '#e3f2fd', color: '#1565c0', badge: null },
    { route: 'content',           icon: 'document-text-outline',   label: 'Content & Support',   desc: 'FAQs, contacts, chat texts',        bg: '#fce4ec', color: '#c62828', badge: null },
  ];
 
  constructor(private router: Router, private auth: Auth) {}
 
  navigate(route: string) { this.router.navigate([`/admin/${route}`]); }
  logout() { this.auth.logout(); this.router.navigate(['/login'], { replaceUrl: true }); }
}