import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonIcon,IonButton,IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { settingsOutline, optionsOutline, createOutline, trashOutline, addCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-categorymngmnt',
  templateUrl: './categorymngmnt.page.html',
  styleUrls: ['./categorymngmnt.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonIcon]
})
export class CategorymngmntPage  implements OnInit {
 
  categories = [
    { id:'c1', name:'Entertainment', emoji:'🎬', bgColor:'#fff8e1', color:'#f9a825', appCount:6 },
    { id:'c2', name:'Music',         emoji:'🎵', bgColor:'#e8f5e9', color:'#2e7d32', appCount:4 },
    { id:'c3', name:'Gaming',        emoji:'🎮', bgColor:'#e3f2fd', color:'#1565c0', appCount:3 },
    { id:'c4', name:'Education',     emoji:'📚', bgColor:'#fce4ec', color:'#c62828', appCount:5 },
    { id:'c5', name:'News',          emoji:'📰', bgColor:'#f3e5f5', color:'#6a1b9a', appCount:2 },
    { id:'c6', name:'Fitness',       emoji:'💪', bgColor:'#e0f7fa', color:'#00838f', appCount:3 },
  ];
 
  constructor(private alertCtrl: AlertController, private toastCtrl: ToastController) {
    addIcons({ settingsOutline, optionsOutline, createOutline, trashOutline, addCircleOutline });
  }
  ngOnInit() {}
 
  async addCategory() {
    const alert = await this.alertCtrl.create({
      header: 'Add Category',
      inputs: [
        { name: 'name',  type: 'text', placeholder: 'Category Name' },
        { name: 'emoji', type: 'text', placeholder: 'Emoji (e.g. 🏠)' },
        { name: 'color', type: 'text', placeholder: 'Hex color (e.g. #1a73e8)' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: data => {
          this.categories.push({ id: Date.now().toString(), name: data.name, emoji: data.emoji, bgColor: data.color + '33', color: data.color, appCount: 0 });
          // TODO: API call
        }},
      ],
    });
    await alert.present();
  }
 
  async editCategory(cat: any) {
    const alert = await this.alertCtrl.create({
      header: `Edit ${cat.name}`,
      inputs: [
        { name: 'name',  type: 'text', value: cat.name,  placeholder: 'Category Name' },
        { name: 'emoji', type: 'text', value: cat.emoji, placeholder: 'Emoji'         },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', handler: data => { cat.name = data.name; cat.emoji = data.emoji; /* TODO: API */ } },
      ],
    });
    await alert.present();
  }
 
  async deleteCategory(cat: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Category',
      message: `Delete "${cat.name}"? All apps in this category will be unlinked.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => {
          this.categories = this.categories.filter(c => c.id !== cat.id); // TODO: API
        }},
      ],
    });
    await alert.present();
  }
}