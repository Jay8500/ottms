import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-category',
  templateUrl: './category.page.html',
  styleUrls: ['./category.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,IonIcon]
})
export class CategoryPage implements OnInit {
  searchTerm = '';
 
  // ── Dummy data ──────────────────────────────────────────────────────────
  categories = [
    { id: 'entertainment', name: 'Entertainment', emoji: '🎬', bgColor: '#fff8e1', appCount: 6 },
    { id: 'music',         name: 'Music',         emoji: '🎵', bgColor: '#e8f5e9', appCount: 4 },
    { id: 'gaming',        name: 'Gaming',        emoji: '🎮', bgColor: '#e3f2fd', appCount: 3 },
    { id: 'education',     name: 'Education',     emoji: '📚', bgColor: '#fce4ec', appCount: 5 },
    { id: 'news',          name: 'News',          emoji: '📰', bgColor: '#f3e5f5', appCount: 2 },
    { id: 'fitness',       name: 'Fitness',       emoji: '💪', bgColor: '#e0f7fa', appCount: 3 },
  ];
  // ────────────────────────────────────────────────────────────────────────
 
  filteredCategories = [...this.categories];
 
  constructor(private router: Router) {}
 
  ngOnInit() {}
 
  filterCategories() {
    const t = this.searchTerm.toLowerCase();
    this.filteredCategories = this.categories.filter(c => c.name.toLowerCase().includes(t));
  }
 
  openCategory(cat: any) {
    this.router.navigate(['/user/ott-list', cat.id]);
  }
}
