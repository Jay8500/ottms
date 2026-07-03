import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, optionsOutline, shieldCheckmarkOutline, starOutline, arrowBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-sellerslist',
  templateUrl: './sellerslist.page.html',
  styleUrls: ['./sellerslist.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, IonIcon]
})
export class SellerslistPage implements OnInit {
  activeFilter = 'all';
  ottName = 'Netflix';
  ottColor = '#e50914';
  selectedValidity = '1 Month';

  filters = [
    { key: 'all',      label: 'All',           icon: '' },
    { key: 'stars',    label: 'Top Stars',      icon: 'star-outline' },
    { key: 'verified', label: 'Verified',       icon: 'shield-checkmark-outline' },
    { key: 'fast',     label: 'Fast Service',   icon: '' },
    { key: 'online',   label: 'Online Now',     icon: '' },
  ];

  private ottMap: any = {
    netflix: { name:'Netflix',  color:'#e50914' },
    prime:   { name:'Prime',    color:'#00a8e0' },
    hotstar: { name:'Hotstar',  color:'#1565c0' },
    sony:    { name:'SonyLIV', color:'#e91e63' },
    spotify: { name:'Spotify',  color:'#1db954' },
    zee5:    { name:'ZEE5',    color:'#8e24aa' },
  };

  allSellers = [
    { id:'s1', name:'Rahul',  uniqueNum:104, rating:5, reviewCount:128, isOnline:true,  isVerified:true,  price:149, batches:['⚡ Fast', '✅ Trusted'] },
    { id:'s2', name:'Priya',  uniqueNum:217, rating:4, reviewCount:54,  isOnline:false, isVerified:false, price:140, batches:['✅ Trusted'] },
    { id:'s3', name:'Arjun',  uniqueNum:88,  rating:4, reviewCount:92,  isOnline:true,  isVerified:true,  price:145, batches:['⚡ Fast', '🎯 Accurate'] },
    { id:'s4', name:'Deepa',  uniqueNum:201, rating:3, reviewCount:22,  isOnline:true,  isVerified:false, price:135, batches:[] },
  ];

  filteredSellers = [...this.allSellers];

  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({ settingsOutline, optionsOutline, shieldCheckmarkOutline, starOutline, arrowBackOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('id') || 'netflix';
    const validity = this.route.snapshot.queryParamMap.get('validity') || '1 Month';
    const info = this.ottMap[id] || { name: id, color: '#1a73e8' };
    this.ottName = info.name;
    this.ottColor = info.color;
    this.selectedValidity = validity;
    this.filteredSellers = [...this.allSellers];
  }

  setFilter(key: string) {
    this.activeFilter = key;
    if (key === 'all')      this.filteredSellers = [...this.allSellers];
    else if (key === 'stars')    this.filteredSellers = [...this.allSellers].sort((a,b) => b.rating - a.rating);
    else if (key === 'verified') this.filteredSellers = this.allSellers.filter(s => s.isVerified);
    else if (key === 'fast')     this.filteredSellers = this.allSellers.filter(s => s.batches.some((b:string) => b.includes('Fast')));
    else if (key === 'online')   this.filteredSellers = this.allSellers.filter(s => s.isOnline);
  }

  selectSeller(s: any) {
    this.router.navigate(['/user/payment'], { queryParams: { sellerId: s.id, price: s.price } });
  }

  getStars(rating: number, type: 'filled'|'empty') {
    return type === 'filled' ? Array(rating).fill(0) : Array(5 - rating).fill(0);
  }
}
