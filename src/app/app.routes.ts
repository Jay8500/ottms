import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admintab/admintab.routes').then((m) => m.routes),
  },
  {
    path: 'user',
    loadChildren: () => import('./user/usertab/usertab.routes').then( m => m.routes)
  }
];
