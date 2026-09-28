import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, chevronForwardOutline, addCircleOutline, eyeOffOutline,
  filmOutline, musicalNotesOutline, gameControllerOutline, bookOutline,
  barbellOutline, pricetagOutline, tvOutline, headsetOutline, basketballOutline,
  restaurantOutline, airplaneOutline, schoolOutline, newspaperOutline, giftOutline,
  happyOutline, constructOutline, medkitOutline, shirtOutline, carOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { DataService } from '../../shared/data.service';
import { Category, CmsEntity } from '../../shared/models';
import { humanError } from '../../shared/errors';

/** 3 — Categories. Create, edit, reorder and hide the app's top-level categories. */
@Component({
  selector: 'app-categorymngmnt',
  templateUrl: './categorymngmnt.page.html',
  styleUrls: ['./categorymngmnt.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, EntityEditorComponent, IonFooter, IonRefresher, IonRefresherContent],
})
export class CategorymngmntPage implements OnInit {
  items: Category[] = [];
  editing: Category | null = null;
  editorOpen = false;
  isNew = false;

  // "Create more icons" — six was thin for a category picker meant to
  // cover everything from movies to fitness to kids' content.
  readonly icons = [
    'film-outline', 'musical-notes-outline', 'game-controller-outline',
    'book-outline', 'barbell-outline', 'pricetag-outline',
    'tv-outline', 'headset-outline', 'basketball-outline', 'restaurant-outline',
    'airplane-outline', 'school-outline', 'newspaper-outline', 'gift-outline',
    'happy-outline', 'construct-outline', 'medkit-outline', 'shirt-outline', 'car-outline',
  ];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, chevronForwardOutline, addCircleOutline, eyeOffOutline,
      filmOutline, musicalNotesOutline, gameControllerOutline, bookOutline,
      barbellOutline, pricetagOutline, tvOutline, headsetOutline, basketballOutline,
      restaurantOutline, airplaneOutline, schoolOutline, newspaperOutline, giftOutline,
      happyOutline, constructOutline, medkitOutline, shirtOutline, carOutline,
    });
  }

  async ngOnInit() {
    await this.load();
    if (this.route.snapshot.queryParamMap.get('new')) this.create();
  }

  private async load() {
    try {
      this.items = await this.data.getCategories();
    } catch (e) {
      this.toast(humanError(e, 'Could not load categories'));
    }
  }

  create() {
    this.isNew = true;
    this.editing = {
      id: this.data.newId('cat'), title: '', subName: '',
      color: '#F9D54B', icon: 'film-outline',
      position: this.items.length + 1, active: true, appCount: 0,
    };
    this.editorOpen = true;
  }

  edit(c: Category) {
    this.isNew = false;
    this.editing = { ...c };
    this.editorOpen = true;
  }

  /** Drill into the platforms that live under this category. */
  openApps(c: Category) {
    this.router.navigate(['/admin/entertainment'], { queryParams: { cat: c.id } });
  }

  async onSave(e: CmsEntity) {
    try {
      await this.data.saveCategory(e as Category);
      await this.load();
      this.editorOpen = false;
      this.toast(this.isNew ? 'Category created' : 'Category updated');
    } catch (err) {
      this.toast(humanError(err, 'Could not save this category'));
    }
  }

  async onRemove(id: string) {
    const cat = this.items.find(c => c.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Delete category?',
      message: cat?.appCount
        ? `${cat.title} has ${cat.appCount} platforms under it. They will be left without a category.`
        : `${cat?.title} will be removed from the app.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            try {
              await this.data.deleteCategory(id);
              await this.load();
              this.editorOpen = false;
              this.toast('Category deleted');
            } catch (err) {
              this.toast(humanError(err, 'Could not delete this category'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}