import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent, IonHeader, IonTitle, IonToolbar,
  IonButtons, IonBackButton, IonIcon, IonSearchbar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, searchOutline, settingsOutline, optionsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-ottplatforms',
  templateUrl: './ottplatforms.page.html',
  styleUrls: ['./ottplatforms.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonContent, IonIcon, 
  ]
})
export class OttplatformsPage implements OnInit {
  categoryName = '';
  searchTerm   = '';

  private appsMap: any = {
    entertainment: [
      { id:'netflix', name:'Netflix',  initial:'N', color:'#e50914', plan:'4K Ultra HD',  sellers:24, startingPrice:149, available:8 },
      { id:'prime',   name:'Prime',    initial:'P', color:'#00a8e0', plan:'HD + Live TV', sellers:18, startingPrice:99,  available:5 },
      { id:'hotstar', name:'Hotstar',  initial:'H', color:'#1565c0', plan:'HD + Sports',  sellers:12, startingPrice:109, available:3 },
      { id:'sony',    name:'SonyLIV', initial:'S', color:'#e91e63', plan:'HD',            sellers:7,  startingPrice:89,  available:0 },
      { id:'zee5',    name:'ZEE5',    initial:'Z', color:'#8e24aa', plan:'HD + Originals',sellers:9,  startingPrice:79,  available:2 },
    ],
    music: [
      { id:'spotify', name:'Spotify',       initial:'S', color:'#1db954', plan:'Premium', sellers:15, startingPrice:59, available:6 },
      { id:'ytmusic', name:'YouTube Music', initial:'Y', color:'#ff0000', plan:'Premium', sellers:8,  startingPrice:49, available:4 },
    ],
    gaming: [
      { id:'xbox',   name:'Xbox Game Pass', initial:'X', color:'#107c10', plan:'Ultimate',  sellers:5, startingPrice:299, available:2 },
      { id:'psplus', name:'PS Plus',        initial:'P', color:'#003791', plan:'Essential', sellers:4, startingPrice:249, available:1 },
    ],
    education: [
      { id:'coursera',   name:'Coursera',   initial:'C', color:'#0056d3', plan:'Plus',    sellers:6, startingPrice:199, available:3 },
      { id:'skillshare', name:'Skillshare', initial:'S', color:'#FF8C00', plan:'Premium', sellers:3, startingPrice:149, available:1 },
    ],
  };

  private catNames: any = {
    entertainment:'Entertainment', music:'Music',
    gaming:'Gaming', education:'Education',
    news:'News', fitness:'Fitness'
  };

  allApps: any[] = [];
  filtered: any[] = [];

  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({ chevronForwardOutline, searchOutline, settingsOutline, optionsOutline });
  }

  ngOnInit() {
    const catId = this.route.snapshot.queryParamMap.get('cat') || 'entertainment';
    this.categoryName = this.catNames[catId] || catId;
    this.allApps = this.appsMap[catId] || [];
    this.filtered = [...this.allApps];
  }

  filter() {
    const t = this.searchTerm.toLowerCase();
    this.filtered = !t ? [...this.allApps] : this.allApps.filter(a => a.name.toLowerCase().includes(t));
  }

  selectApp(app: any) {
    this.router.navigate(['/user/accnttype'], { queryParams: { id: app.id } });
  }
}
