import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, cloudUploadOutline, saveOutline, trashOutline, checkmarkOutline,
  filmOutline, musicalNotesOutline, gameControllerOutline, bookOutline,
  barbellOutline, pricetagOutline, tvOutline, headsetOutline, calendarOutline,
  personOutline, cartOutline, cashOutline, chatbubblesOutline, starOutline,
} from 'ionicons/icons';
import { CmsEntity } from '../../shared/models';

/**
 * The editor sheet the admin deck repeats on every CMS screen:
 * Title / Sub-name / Colour / Icon / Image upload / Position / Save / Delete.
 *
 * Page-specific fields (months, amount, seat limits…) go in via <ng-content>.
 */
@Component({
  selector: 'app-entity-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './entity-editor.component.html',
  styleUrls: ['./entity-editor.component.scss'],
})
export class EntityEditorComponent {
  @Input() open = false;
  @Input() heading = 'Create New';
  @Input() model: CmsEntity | null = null;

  @Input() showSubName = true;
  @Input() showColor = true;
  @Input() showIcon = true;
  @Input() showImage = true;
  @Input() showPosition = true;
  @Input() showDelete = false;

  @Input() colors = ['#F9D54B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F97316', '#9CA3AF'];
  @Input() icons = [
    'film-outline', 'musical-notes-outline', 'game-controller-outline',
    'book-outline', 'barbell-outline', 'pricetag-outline',
  ];
  @Input() positionOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  @Output() save = new EventEmitter<CmsEntity>();
  @Output() remove = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  constructor() {
    addIcons({
      closeOutline, cloudUploadOutline, saveOutline, trashOutline, checkmarkOutline,
      filmOutline, musicalNotesOutline, gameControllerOutline, bookOutline,
      barbellOutline, pricetagOutline, tvOutline, headsetOutline, calendarOutline,
      personOutline, cartOutline, cashOutline, chatbubblesOutline, starOutline,
    });
  }

  onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.model) return;
    const reader = new FileReader();
    reader.onload = () => { if (this.model) this.model.imageUrl = reader.result as string; };
    reader.readAsDataURL(file);
  }

  onSave() {
    if (!this.model?.title?.trim()) return;
    this.save.emit(this.model);
  }
}