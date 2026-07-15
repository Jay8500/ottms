import { Routes } from '@angular/router';
import { UsertabPage } from './usertab.page';

export const routes: Routes = [
  {
    path: '',
    component: UsertabPage,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home',         loadComponent: () => import('../home/home.page').then(m => m.HomePage) },
      { path: 'category',     loadComponent: () => import('../category/category.page').then(m => m.CategoryPage) },
      { path: 'ottplatforms', loadComponent: () => import('../ottplatforms/ottplatforms.page').then(m => m.OttplatformsPage) },
      { path: 'accnttype',    loadComponent: () => import('../accnttype/accnttype.page').then(m => m.AccnttypePage) },
      { path: 'validity',     loadComponent: () => import('../validity/validity.page').then(m => m.ValidityPage) },
      { path: 'sellerslist',  loadComponent: () => import('../sellerslist/sellerslist.page').then(m => m.SellerslistPage) },
      { path: 'payment',      loadComponent: () => import('../payment/payment.page').then(m => m.PaymentPage) },
      { path: 'chat',         loadComponent: () => import('../chat/chat.page').then(m => m.ChatPage) },
      { path: 'wallet',       loadComponent: () => import('../wallet/wallet.page').then(m => m.WalletPage) },
      { path: 'rating',       loadComponent: () => import('../rating/rating.page').then(m => m.RatingPage) },
      { path: 'support',      loadComponent: () => import('../support/support.page').then(m => m.SupportPage) },
      { path: 'creategroup',  loadComponent: () => import('../../seller/creategroup/creategroup.page').then(m => m.CreategroupPage) },
    ],
  },
];
