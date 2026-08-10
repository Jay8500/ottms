import { Routes } from '@angular/router';
import { AdmintabPage } from './admintab.page';

export const routes: Routes = [
  {
    path: '',
    component: AdmintabPage,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      // Launcher
      {
        path: 'dashboard',
        loadComponent: () => import('../dashboard/dashboard.page').then(m => m.DashboardPage),
      },

      // ── Built ────────────────────────────────────────────────────────────
      {
        path: 'formbuilder',        // 1 — Create Account/Group
        loadComponent: () => import('../formbuilder/formbuilder.page').then(m => m.AdminFormbuilderPage),
      },
      {
        path: 'homemgnmt',          // 2 — Home
        loadComponent: () => import('../homemgnmt/homemgnmt.page').then(m => m.HomemgnmtPage),
      },
      {
        path: 'categorymngmnt',     // 3 — Categories
        loadComponent: () => import('../categorymngmnt/categorymngmnt.page').then(m => m.CategorymngmntPage),
      },
      {
        path: 'commerce',           // 5 — Commerce
        loadComponent: () => import('../commerce/commerce.page').then(m => m.AdminCommercePage),
      },
      {
        path: 'ratings',            // 15 — Ratings & Batches
        loadComponent: () => import('../ratings/ratings.page').then(m => m.AdminRatingsPage),
      },
      {
        path: 'entertainment',      // 4 — Entertainment / OTT platforms
        loadComponent: () => import('../entertainment/entertainment.page').then(m => m.AdminEntertainmentPage),
      },
      {
        path: 'validity',           // 6 — Validity
        loadComponent: () => import('../validity/validity.page').then(m => m.AdminValidityPage),
      },
      {
        path: 'usermngmnt',         // 7 — User's Data
        loadComponent: () => import('../usermngmnt/usermngmnt.page').then(m => m.UsermngmntPage),
      },
      {
        path: 'groupapprovals',     // 8 — Group's
        loadComponent: () => import('../groupapprovals/groupapprovals.page').then(m => m.GroupapprovalsPage),
      },
      {
        path: 'walletadmin',        // 9 — Wallet
        loadComponent: () => import('../walletadmin/walletadmin.page').then(m => m.WalletadminPage),
      },
      {
        path: 'transactions',       // 10 — Transactions
        loadComponent: () => import('../transactions/transactions.page').then(m => m.TransactionsPage),
      },
      {
        path: 'paymentaprpovals',   // 11 — Payment's
        loadComponent: () => import('../psymentaprpovals/psymentaprpovals.page').then(m => m.PsymentaprpovalsPage),
      },
      {
        path: 'chats',              // 12 — Chat's
        loadComponent: () => import('../chats/chats.page').then(m => m.AdminChatsPage),
      },
      {
        path: 'paymentform',        // 13 — Payment Form
        loadComponent: () => import('../paymentform/paymentform.page').then(m => m.AdminPaymentformPage),
      },
      {
        path: 'cntnorspptmngmnt',   // 14 — Support
        loadComponent: () => import('../cntnorspptmngmnt/cntnorspptmngmnt.page').then(m => m.CntnorspptmngmntPage),
      },
      {
        path: 'terms',              // 18 — Terms & Conditions
        loadComponent: () => import('../terms/terms.page').then(m => m.AdminTermsPage),
      },

      {
        path: 'followus',           // 16 — Follow Us
        loadComponent: () => import('../followus/followus.page').then(m => m.AdminFollowusPage),
      },
      {
        path: 'notifications',      // 19 — Notification controls (L2)
        loadComponent: () => import('../notifications/notifications.page').then(m => m.AdminNotificationsPage),
      },
      {
        path: 'refer',              // 17 — Refer Friends
        loadComponent: () => import('../refer/refer.page').then(m => m.AdminReferPage),
      },
    ],
  },
];