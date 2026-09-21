import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
export class EntityEditorComponent implements OnChanges {
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

  /** The raw, uncropped upload — kept only in memory so switching between
   *  preset sizes re-crops from the original instead of cropping an
   *  already-cropped image down further each time. */
  private originalImg: HTMLImageElement | null = null;
  imgPreset: 'square' | 'wide' = 'square';
  get hasFreshUpload() { return !!this.originalImg; }

  /** Each edit()/create() in the parent hands in a new model object — reset
   *  the leftover in-memory upload state so it doesn't leak into the next
   *  item opened in the same sheet. */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['model']) {
      this.originalImg = null;
      this.imgPreset = 'square';
    }
  }

  onImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !this.model) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => { this.originalImg = img; this.applyPreset(); };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /** "Select from preset image sizes after uploading a logo." Square for
   *  an icon-style logo, wide for a banner — center-cropped so nothing
   *  gets stretched or squashed. */
  setPreset(p: 'square' | 'wide') {
    this.imgPreset = p;
    this.applyPreset();
  }

  private applyPreset() {
    if (!this.originalImg || !this.model) return;
    const ratio = this.imgPreset === 'square' ? 1 : 16 / 9;
    const img = this.originalImg;

    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (sw / sh > ratio) { sw = sh * ratio; sx = (img.width - sw) / 2; }
    else { sh = sw / ratio; sy = (img.height - sh) / 2; }

    const outW = this.imgPreset === 'square' ? 400 : 640;
    const outH = Math.round(outW / ratio);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    this.model.imageUrl = canvas.toDataURL('image/jpeg', 0.9);
  }

  /** Reported as "no delete option after uploading pic" — clicking the
   *  preview only ever re-opened the file picker to replace it, with no
   *  way to clear it back to empty. Shared by every admin page that
   *  uploads an image, so fixed once here. */
  removeImage(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    if (this.model) this.model.imageUrl = undefined;
    this.originalImg = null;
  }

  onSave() {
    if (!this.model?.title?.trim()) return;
    this.save.emit(this.model);
  }
}