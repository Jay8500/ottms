import { Component, OnInit } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton,
  IonIcon, IonLabel, IonRouterOutlet
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  homeOutline, peopleOutline, shieldCheckmarkOutline,
  cardOutline, walletOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-admintab',
  templateUrl: './admintab.page.html',
  styleUrls: ['./admintab.page.scss'],
  standalone: true,
  imports: [CommonModule, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet]
})
export class AdmintabPage implements OnInit {
  constructor() {
    addIcons({ homeOutline, peopleOutline, shieldCheckmarkOutline, cardOutline, walletOutline });
  }
  ngOnInit() {}
}
