import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButtons,IonBackButton,IonChip } from '@ionic/angular/standalone';

@Component({
  selector: 'app-sellerslist',
  templateUrl: './sellerslist.page.html',
  styleUrls: ['./sellerslist.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon,IonButtons,IonBackButton,IonChip]
})
export class SellerslistPage implements OnInit {
  activeFilter = 'all';
  filters = [
    { key: 'all',      label: 'All',      icon: '' },
    { key: 'stars',    label: 'Top Stars', icon: 'star-outline' },
    { key: 'verified', label: 'Verified',  icon: 'shield-checkmark-outline' },
  ];
 
  // ── Dummy sellers ─────────────────────────────────────────────────────
  allSellers = [
    { id: 's1', name: 'Rahul',  uniqueNum: 104, rating: 5, reviewCount: 128, isOnline: true,  isVerified: true,  price: 149, screensLeft: 1, batches: ['⚡ Fast'] },
    { id: 's2', name: 'Priya',  uniqueNum: 217, rating: 4, reviewCount: 54,  isOnline: false, isVerified: false, price: 140, screensLeft: 3, batches: ['✅ Trust'] },
    { id: 's3', name: 'Arjun',  uniqueNum: 88,  rating: 4, reviewCount: 92,  isOnline: true,  isVerified: true,  price: 145, screensLeft: 2, batches: ['🎯 Accurate'] },
    { id: 's4', name: 'Deepa',  uniqueNum: 201, rating: 3, reviewCount: 22,  isOnline: true,  isVerified: false, price: 135, screensLeft: 4, batches: [] },
  ];
  // ─────────────────────────────────────────────────────────────────────
 
  filteredSellers = [...this.allSellers];
 
  constructor(private route: ActivatedRoute, private router: Router) {}
 
  ngOnInit() {
    // ottId and validityId available from route params for real API call
  }
 
  setFilter(key: string) {
    this.activeFilter = key;
    if (key === 'all')      this.filteredSellers = [...this.allSellers];
    else if (key === 'stars')    this.filteredSellers = this.allSellers.filter(s => s.rating >= 4).sort((a,b) => b.rating - a.rating);
    else if (key === 'verified') this.filteredSellers = this.allSellers.filter(s => s.isVerified);
  }
 
  getStars(rating: number, type: 'filled' | 'empty'): number[] {
    return type === 'filled' ? Array(rating).fill(0) : Array(5 - rating).fill(0);
  }
 
  selectSeller(seller: any) {
    this.router.navigate(['/user/payment', seller.id]);
  }
}
