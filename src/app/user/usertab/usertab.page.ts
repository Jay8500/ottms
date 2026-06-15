import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { homeOutline, gridOutline, walletOutline, headsetOutline } from 'ionicons/icons';

@Component({
  selector: 'app-usertab',
  templateUrl: './usertab.page.html',
  styleUrls: ['./usertab.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonRouterOutlet
  ]
})
export class UsertabPage {
  constructor() {
    addIcons({ homeOutline, gridOutline, walletOutline, headsetOutline });
  }
}