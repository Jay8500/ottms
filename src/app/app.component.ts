import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonApp, IonRouterOutlet, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, cloudDoneOutline } from 'ionicons/icons';
import { NetworkService } from './shared/network.service';
import { LoadingService } from './shared/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [CommonModule, IonApp, IonRouterOutlet, IonIcon],
})
export class AppComponent implements OnInit {
  net = inject(NetworkService);
  loading = inject(LoadingService);

  constructor() {
    addIcons({ cloudOfflineOutline, cloudDoneOutline });
  }

  ngOnInit() {
    this.net.start();
    // The session is already restored by the APP_INITIALIZER in main.ts, and
    // the guards handle where to land — no redirect needed here, which is
    // what previously discarded deep links on a cold start.
  }
}