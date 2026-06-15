import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonIcon, IonButton, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, checkmarkCircle, ellipseOutline } from 'ionicons/icons';

@Component({
  selector: 'app-validity',
  templateUrl: './validity.page.html',
  styleUrls: ['./validity.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar,
    CommonModule, FormsModule, IonIcon, IonButton, IonButtons, IonBackButton
  ]
})
export class ValidityPage implements OnInit {
  ottId      = '';
  action     = 'purchase';
  ottName    = '';
  ottColor   = '#1a73e8';
  ottInitial = 'A';
  selectedId: string | null = null;

  validities = [
    { id: 'v1',  label: '1 Month',   amount: 149,  saveUpto: 30  },
    { id: 'v3',  label: '3 Months',  amount: 399,  saveUpto: 80  },
    { id: 'v6',  label: '6 Months',  amount: 749,  saveUpto: 200 },
    { id: 'v12', label: '12 Months', amount: 1399, saveUpto: 500 },
  ];

  private ottMap: any = {
    netflix: { name: 'Netflix',  color: '#e50914', initial: 'N' },
    prime:   { name: 'Prime',    color: '#00a8e0', initial: 'P' },
    hotstar: { name: 'Hotstar',  color: '#1565c0', initial: 'H' },
    spotify: { name: 'Spotify',  color: '#1db954', initial: 'S' },
    sony:    { name: 'SonyLIV', color: '#e91e63', initial: 'S' },
    zee5:    { name: 'ZEE5',    color: '#8e24aa', initial: 'Z' },
  };

  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({ calendarOutline, checkmarkCircle, ellipseOutline });
  }

  ngOnInit() {
    this.ottId  = this.route.snapshot.queryParamMap.get('id') || 'netflix';
    this.action = this.route.snapshot.queryParamMap.get('action') || 'purchase';
    const info  = this.ottMap[this.ottId] || {
      name: this.ottId, color: '#1a73e8',
      initial: this.ottId[0]?.toUpperCase() || 'A'
    };
    this.ottName    = info.name;
    this.ottColor   = info.color;
    this.ottInitial = info.initial;
  }

  selectValidity(v: any) { this.selectedId = v.id; }

  proceed() {
    if (!this.selectedId) return;
    // Fixed: navigate to /user/sellerslist matching the route
    this.router.navigate(['/user/sellerslist'], {
      queryParams: { id: this.ottId, validity: this.selectedId }
    });
  }
}
