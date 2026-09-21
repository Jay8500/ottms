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
  colorPaletteOutline,
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

  // "Create more icons and colors" — the presets are the quick-tap path,
  // the custom picker below covers everything else.
  @Input() colors = [
    '#F9D54B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981', '#F97316', '#9CA3AF',
    '#EC4899', '#14B8A6', '#6366F1', '#84CC16',
  ];
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
      colorPaletteOutline,
    });
  }

  onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.model) return;
    const reader = new FileReader();
    reader.onload = () => { if (this.model) this.model.imageUrl = reader.result as string; };
    reader.readAsDataURL(file);
  }

  /** Reported as "no delete option after uploading pic" — clicking the
   *  preview only ever re-opened the file picker to replace it, with no
   *  way to clear it back to empty. Shared by every admin page that
   *  uploads an image, so fixed once here. */
  removeImage(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (this.model) this.model.imageUrl = undefined;
  }

  onSave() {
    if (!this.model?.title?.trim()) return;
    this.save.emit(this.model);
  }
}