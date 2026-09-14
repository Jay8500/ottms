import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalController, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, saveOutline, playCircleOutline, cloudUploadOutline, trashOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../shared/supabase.service';
import { humanError } from '../../../shared/errors';
import { FaqItem, LangCode } from '../../../shared/models';

/**
 * Replaces the old two-textarea native alert. That box was cramped, had no
 * room for a real answer, and had nowhere to attach a video at all —
 * onVideo() only ever showed a "not connected yet" toast and threw the file
 * away. This is a proper screen: bigger fields, and a real video upload to
 * the support-videos bucket.
 */
@Component({
  selector: 'app-faq-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './faq-editor.component.html',
  styleUrls: ['./faq-editor.component.scss'],
})
export class FaqEditorComponent {
  @ViewChild('videoInput') videoInput!: ElementRef<HTMLInputElement>;

  @Input({ required: true }) faq!: FaqItem;
  @Input({ required: true }) lang!: LangCode;
  @Input({ required: true }) langLabel!: string;

  question = '';
  answer = '';
  videoPreviewUrl: string | null = null;   // signed URL of what is already saved
  videoRemoved = false;
  private videoFile: File | null = null;
  uploading = false;
  saving = false;

  private modalCtrl = inject(ModalController);
  private sb = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({ closeOutline, saveOutline, playCircleOutline, cloudUploadOutline, trashOutline });
  }

  async ngOnInit() {
    this.question = this.faq.q[this.lang] ?? '';
    this.answer = this.faq.a[this.lang] ?? '';
    const existing = this.faq.videoUrl?.[this.lang];
    if (existing) {
      try { this.videoPreviewUrl = await this.sb.signedUrl('support-videos', existing); }
      catch { /* previously-uploaded file is gone; treat as no video */ }
    }
  }

  get hasVideo() { return !!this.videoPreviewUrl && !this.videoRemoved; }

  pickVideo() { this.videoInput?.nativeElement.click(); }

  onVideoPicked(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      this.toast('Video must be under 50MB');
      return;
    }
    this.videoFile = file;
    this.videoRemoved = false;
    this.videoPreviewUrl = URL.createObjectURL(file);
  }

  removeVideo() {
    this.videoFile = null;
    this.videoPreviewUrl = null;
    this.videoRemoved = true;
  }

  dismiss() { this.modalCtrl.dismiss(); }

  async save() {
    if (!this.question.trim()) { this.toast('Enter the question'); return; }

    this.saving = true;
    try {
      let videoPath: string | null | undefined = undefined;   // undefined = leave unchanged

      if (this.videoFile) {
        this.uploading = true;
        const ext = this.videoFile.name.split('.').pop() ?? 'mp4';
        videoPath = await this.sb.upload(
          'support-videos', `${this.lang}/${this.faq.id}-${Date.now()}.${ext}`, this.videoFile,
        );
      } else if (this.videoRemoved) {
        videoPath = null;
      }

      this.modalCtrl.dismiss({
        question: this.question.trim(),
        answer: this.answer.trim(),
        videoPath,
      }, 'save');
    } catch (e) {
      this.toast(humanError(e, 'Could not save'));
    } finally {
      this.uploading = false;
      this.saving = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}
