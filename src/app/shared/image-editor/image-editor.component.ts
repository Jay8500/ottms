import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline, checkmarkOutline, cropOutline, happyOutline,
  textOutline, brushOutline, arrowUndoOutline, trashOutline,
} from 'ionicons/icons';

type Tool = 'pen' | 'sticker' | 'text' | 'crop' | null;

interface OverlayItem {
  id: string;
  kind: 'text' | 'sticker';
  /** Percent of the image's width/height, so position survives the image
   *  being shown at any screen size. */
  xPct: number;
  yPct: number;
  text?: string;
  emoji?: string;
  color?: string;
}

/**
 * "Put options (Crop, Sticker, Text, Pen) like whatsapp chat - so that if
 * any issue they will add above for fast understanding." A lightweight
 * markup editor for a photo about to be sent in chat — not a full photo
 * editor, just enough to circle a problem and label it before sending,
 * which is the actual use case described.
 *
 * Shared rather than chat-specific so any other "send a photo" flow in the
 * app can reuse it later without copying this component.
 */
@Component({
  selector: 'app-image-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './image-editor.component.html',
  styleUrls: ['./image-editor.component.scss'],
})
export class ImageEditorComponent implements OnChanges {
  @ViewChild('stage') stageRef!: ElementRef<HTMLDivElement>;
  @ViewChild('baseImg') baseImgRef!: ElementRef<HTMLImageElement>;
  @ViewChild('penCanvas') penCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() file: File | null = null;
  @Output() done = new EventEmitter<File>();
  @Output() cancelled = new EventEmitter<void>();

  imgUrl = '';
  tool: Tool = null;
  ready = false;

  readonly penColors = ['#EF4444', '#F59E0B', '#3B82F6', '#111827', '#FFFFFF'];
  penColor = this.penColors[0];
  private strokes: { color: string; points: { x: number; y: number }[] }[] = [];
  private currentStroke: { color: string; points: { x: number; y: number }[] } | null = null;

  readonly stickers = ['🔴', '⭐', '❗', '✅', '❌', '⬆️', '👉'];
  overlays: OverlayItem[] = [];
  private dragId: string | null = null;
  private dragOffset = { x: 0, y: 0 };

  /** Percent-based crop box — 0..100 on each axis. */
  crop = { x: 10, y: 10, w: 80, h: 80 };
  private cropDrag: 'move' | 'resize' | null = null;
  private cropStart = { x: 0, y: 0, box: { x: 0, y: 0, w: 0, h: 0 } };

  constructor() {
    addIcons({
      closeOutline, checkmarkOutline, cropOutline, happyOutline,
      textOutline, brushOutline, arrowUndoOutline, trashOutline,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['file'] && this.file) {
      this.reset();
      const reader = new FileReader();
      reader.onload = () => { this.imgUrl = reader.result as string; };
      reader.readAsDataURL(this.file);
    }
  }

  private reset() {
    this.tool = null;
    this.ready = false;
    this.strokes = [];
    this.currentStroke = null;
    this.overlays = [];
    this.crop = { x: 10, y: 10, w: 80, h: 80 };
  }

  onImgLoad() {
    const img = this.baseImgRef.nativeElement;
    const canvas = this.penCanvasRef.nativeElement;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    this.ready = true;
  }

  pickTool(t: Tool) {
    this.tool = this.tool === t ? null : t;
  }

  // ── Pen ──────────────────────────────────────────────────────────────
  private canvasPoint(e: PointerEvent): { x: number; y: number } {
    const canvas = this.penCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  onPenDown(e: PointerEvent) {
    if (this.tool !== 'pen') return;
    this.currentStroke = { color: this.penColor, points: [this.canvasPoint(e)] };
  }

  onPenMove(e: PointerEvent) {
    if (this.tool !== 'pen' || !this.currentStroke) return;
    this.currentStroke.points.push(this.canvasPoint(e));
    this.redrawPen();
  }

  onPenUp() {
    if (!this.currentStroke) return;
    this.strokes.push(this.currentStroke);
    this.currentStroke = null;
  }

  undoPen() {
    this.strokes.pop();
    this.redrawPen();
  }

  private redrawPen() {
    const canvas = this.penCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const lineWidth = Math.max(3, canvas.width / 160);
    for (const stroke of [...this.strokes, ...(this.currentStroke ? [this.currentStroke] : [])]) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  // ── Stickers & text ─────────────────────────────────────────────────
  /** Each new item nudges a little further from centre so it doesn't land
   *  exactly on top of the last one, unreachable until dragged apart. */
  private nextSpot(): { x: number; y: number } {
    const step = (this.overlays.length % 5) * 6;
    return { x: 40 + step, y: 40 + step };
  }

  addSticker(emoji: string) {
    const spot = this.nextSpot();
    this.overlays.push({ id: 'ov_' + Date.now(), kind: 'sticker', emoji, xPct: spot.x, yPct: spot.y });
  }

  addingText = false;
  draftText = '';

  startText() { this.addingText = true; this.draftText = ''; }

  confirmText() {
    if (this.draftText.trim()) {
      const spot = this.nextSpot();
      this.overlays.push({
        id: 'ov_' + Date.now(), kind: 'text', text: this.draftText.trim(),
        color: this.penColor, xPct: spot.x, yPct: spot.y,
      });
    }
    this.addingText = false;
  }

  removeOverlay(id: string) {
    this.overlays = this.overlays.filter(o => o.id !== id);
  }

  onOverlayDown(e: PointerEvent, item: OverlayItem) {
    if (this.tool !== 'sticker' && this.tool !== 'text') return;
    e.stopPropagation();
    this.dragId = item.id;
    const stage = this.stageRef.nativeElement.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - stage.left - (item.xPct / 100) * stage.width,
      y: e.clientY - stage.top - (item.yPct / 100) * stage.height,
    };
  }

  onStageMove(e: PointerEvent) {
    if (this.dragId) {
      const stage = this.stageRef.nativeElement.getBoundingClientRect();
      const item = this.overlays.find(o => o.id === this.dragId);
      if (item) {
        item.xPct = Math.min(100, Math.max(0, ((e.clientX - stage.left - this.dragOffset.x) / stage.width) * 100));
        item.yPct = Math.min(100, Math.max(0, ((e.clientY - stage.top - this.dragOffset.y) / stage.height) * 100));
      }
      return;
    }
    if (this.cropDrag) this.onCropMove(e);
    else this.onPenMove(e);
  }

  onStageUp() {
    this.dragId = null;
    this.cropDrag = null;
    this.onPenUp();
  }

  // ── Crop ─────────────────────────────────────────────────────────────
  onCropBodyDown(e: PointerEvent) {
    if (this.tool !== 'crop') return;
    e.stopPropagation();
    this.cropDrag = 'move';
    this.cropStart = { x: e.clientX, y: e.clientY, box: { ...this.crop } };
  }

  onCropHandleDown(e: PointerEvent) {
    if (this.tool !== 'crop') return;
    e.stopPropagation();
    this.cropDrag = 'resize';
    this.cropStart = { x: e.clientX, y: e.clientY, box: { ...this.crop } };
  }

  private onCropMove(e: PointerEvent) {
    const stage = this.stageRef.nativeElement.getBoundingClientRect();
    const dxPct = ((e.clientX - this.cropStart.x) / stage.width) * 100;
    const dyPct = ((e.clientY - this.cropStart.y) / stage.height) * 100;
    const start = this.cropStart.box;

    if (this.cropDrag === 'move') {
      this.crop.x = Math.min(100 - start.w, Math.max(0, start.x + dxPct));
      this.crop.y = Math.min(100 - start.h, Math.max(0, start.y + dyPct));
    } else if (this.cropDrag === 'resize') {
      this.crop.w = Math.min(100 - start.x, Math.max(10, start.w + dxPct));
      this.crop.h = Math.min(100 - start.y, Math.max(10, start.h + dyPct));
    }
  }

  // ── Export ───────────────────────────────────────────────────────────
  async confirm() {
    const img = this.baseImgRef.nativeElement;
    const penCanvas = this.penCanvasRef.nativeElement;

    const out = document.createElement('canvas');
    const useCrop = this.tool === 'crop' || this.crop.x !== 10 || this.crop.y !== 10 || this.crop.w !== 80 || this.crop.h !== 80;
    const sx = useCrop ? (this.crop.x / 100) * img.naturalWidth : 0;
    const sy = useCrop ? (this.crop.y / 100) * img.naturalHeight : 0;
    const sw = useCrop ? (this.crop.w / 100) * img.naturalWidth : img.naturalWidth;
    const sh = useCrop ? (this.crop.h / 100) * img.naturalHeight : img.naturalHeight;

    out.width = sw;
    out.height = sh;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.drawImage(penCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

    for (const o of this.overlays) {
      const x = (o.xPct / 100) * img.naturalWidth - sx;
      const y = (o.yPct / 100) * img.naturalHeight - sy;
      if (x < -50 || y < -50 || x > sw + 50 || y > sh + 50) continue; // cropped out
      if (o.kind === 'sticker') {
        ctx.font = `${Math.round(out.width / 8)}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(o.emoji ?? '', x, y);
      } else {
        ctx.font = `bold ${Math.round(out.width / 20)}px sans-serif`;
        ctx.fillStyle = o.color ?? '#111827';
        ctx.textBaseline = 'middle';
        // A light outline keeps text readable over any background colour.
        ctx.lineWidth = Math.max(2, out.width / 300);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeText(o.text ?? '', x, y);
        ctx.fillText(o.text ?? '', x, y);
      }
    }

    const blob: Blob = await new Promise((resolve) =>
      out.toBlob((b) => resolve(b!), 'image/jpeg', 0.92));
    const name = this.file?.name ?? 'photo.jpg';
    this.done.emit(new File([blob], name, { type: 'image/jpeg' }));
  }
}
