import { Routes } from '@angular/router';
import { AdmintabPage } from './admintab.page';

export const routes: Routes = [
  {
    path: '',
    component: AdmintabPage,
    children: [
      {
        path: '',
        redirectTo: 'homemgnmt',
        pathMatch: 'full',
      },
      {
        path: 'homemgnmt', //1
        loadComponent: () =>
          import('../homemgnmt/homemgnmt.page').then((m) => m.HomemgnmtPage),
      },
      {
        path: 'usermngmnt', //2
        loadComponent: () =>
          import('../usermngmnt/usermngmnt.page').then((m) => m.UsermngmntPage),
      },
      {
        path: 'groupapprovals', //3
        loadComponent: () =>
          import('../groupapprovals/groupapprovals.page').then(
            (m) => m.GroupapprovalsPage,
          ),
      },
      {
        path: 'walletadmin', //4
        loadComponent: () =>
          import('../walletadmin/walletadmin.page').then(
            (m) => m.WalletadminPage,
          ),
      },
      {
        path: 'paymentaprpovals', //5
        loadComponent: () =>
          import('../psymentaprpovals/psymentaprpovals.page').then(
            (m) => m.PsymentaprpovalsPage,
          ),
      },
      {
        path: 'categorymngmnt', //6
        loadComponent: () =>
          import('../categorymngmnt/categorymngmnt.page').then(
            (m) => m.CategorymngmntPage,
          ),
      },
      {
        path: 'cntnorspptmngmnt', //7
        loadComponent: () =>
          import('../cntnorspptmngmnt/cntnorspptmngmnt.page').then(
            (m) => m.CntnorspptmngmntPage,
          ),
      }
    ],
  }
];
