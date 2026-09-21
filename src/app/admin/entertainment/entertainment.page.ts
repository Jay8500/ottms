import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { IonContent, IonIcon, AlertController, ToastController, IonFooter, IonRefresher, IonRefresherContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  createOutline, addCircleOutline, desktopOutline, eyeOffOutline, closeOutline,
  chevronUpOutline, chevronDownOutline,
} from 'ionicons/icons';
import { AdminHeaderComponent } from '../shared/admin-header.component';
import { AdminSearchbarComponent } from '../shared/admin-searchbar.component';
import { EntityEditorComponent } from '../shared/entity-editor.component';
import { OttLogoComponent } from '../../shared/ott-logo/ott-logo.component';
import { DataService } from '../../shared/data.service';
import { CmsEntity, OttApp, OttPlanTier } from '../../shared/models';

/** 4 — Entertainment. The OTT platforms inside a category, and the seat limit
 *  admin sets for each plan tier. */
@Component({
  selector: 'app-admin-entertainment',
  templateUrl: './entertainment.page.html',
  styleUrls: ['./entertainment.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    AdminHeaderComponent, AdminSearchbarComponent, EntityEditorComponent, OttLogoComponent, IonFooter, IonRefresher, IonRefresherContent],
})
export class AdminEntertainmentPage implements OnInit {
  term = '';
  categoryId = '';
  all: OttApp[] = [];
  shown: OttApp[] = [];

  editing: OttApp | null = null;
  editorOpen = false;
  isNew = false;
  /** "Should be removed (starting price, Instructions, Logo Key)" — but
   *  Instructions was explicitly requested and filled in just one round
   *  ago, so deleting it risks losing content someone already typed. This
   *  collapses the three into an out-of-the-way section instead: gone from
   *  the everyday view, still there and still safe if genuinely needed. */
  showAdvanced = false;

  readonly icons = ['tv-outline', 'film-outline', 'musical-notes-outline', 'game-controller-outline'];

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      createOutline, addCircleOutline, desktopOutline, eyeOffOutline, closeOutline,
      chevronUpOutline, chevronDownOutline,
    });
  }

  async ngOnInit() {
    // Reached from the dashboard with no ?cat= at all — the "Create
    // Groups" and "Entertainment" cards both link straight here with no
    // query param. categoryId used to default to the literal string
    // 'entertainment', which is not a real id: creating a platform then
    // tried to insert that into a uuid column and failed outright every
    // time. Editing an existing platform never hit this, because edit()
    // copies the real category_id already on the row — that is why this
    // went unnoticed until someone tried to add a brand new platform.
    const fromQuery = this.route.snapshot.queryParamMap.get('cat');
    this.categoryId = fromQuery ?? await this.resolveDefaultCategoryId();

    await this.load();
    if (this.route.snapshot.queryParamMap.get('new')) this.create();
  }

  /** Falls back to the category literally titled "Entertainment", or the
   *  first active one if that has been renamed. */
  private async resolveDefaultCategoryId(): Promise<string> {
    const cats = await this.data.getCategories();
    const byTitle = cats.find(c => c.title.trim().toLowerCase() === 'entertainment');
    return (byTitle ?? cats.find(c => c.active) ?? cats[0])?.id ?? '';
  }

  private async load() {
    this.all = await this.data.getOttApps(this.categoryId);
    this.apply();
  }

  apply() {
    const t = this.term.trim().toLowerCase();
    this.shown = !t ? [...this.all] : this.all.filter(a => a.title.toLowerCase().includes(t));
  }

  create() {
    this.isNew = true;
    this.showAdvanced = false;
    this.editing = {
      id: this.data.newId('ott'), title: '', subName: '',
      color: '#E50914', icon: 'tv-outline', brand: '',
      categoryId: this.categoryId, tiers: [],
      position: this.all.length + 1, active: true,
      sellers: 0, startingPrice: 0, available: 0, maxActiveGroups: 1,
    };
    this.editorOpen = true;
  }

  edit(a: OttApp) {
    this.isNew = false;
    this.showAdvanced = false;
    // deep-copy tiers so an abandoned edit doesn't mutate the live list
    this.editing = { ...a, tiers: a.tiers.map(t => ({ ...t })) };
    this.editorOpen = true;
  }

  addTier() {
    if (!this.editing) return;
    this.editing.tiers.push({
      id: this.data.newId('tier'), label: '', maxScreens: 1,
    });
  }

  removeTier(t: OttPlanTier) {
    if (!this.editing) return;
    this.editing.tiers = this.editing.tiers.filter(x => x.id !== t.id);
  }

  async onSave(e: CmsEntity) {
    const app = e as OttApp;
    if (app.tiers.some(t => !t.label.trim())) { this.toast('Every plan needs a name'); return; }
    if (app.tiers.some(t => t.maxScreens < 1)) { this.toast('Screens must be at least 1'); return; }
    // Default the logo key to the id so the mark resolves even if left blank.
    if (!app.brand?.trim()) app.brand = app.id;

    await this.data.saveOttApp(app);
    await this.load();
    this.editorOpen = false;
    this.toast(this.isNew ? 'Platform added' : 'Platform updated');
  }

  async onRemove(id: string) {
    const app = this.all.find(a => a.id === id);
    const alert = await this.alertCtrl.create({
      header: 'Delete platform?',
      message: `${app?.title} disappears from the app. Existing groups on this platform are not removed.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            await this.data.deleteOttApp(id);
            await this.load();
            this.editorOpen = false;
            this.toast('Platform deleted');
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, position: 'bottom' });
    t.present();
  }
  /** Pull-to-refresh. */
  async refresh(ev: CustomEvent) {
    await this.ngOnInit();
    (ev.target as HTMLIonRefresherElement).complete();
  }

}