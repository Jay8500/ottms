import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MarkLine {
  text: string;
  color?: string;
  size?: number;     // multiplier of the tile size
  weight?: number;
  spacing?: string;
  italic?: boolean;
  transform?: string;
}

interface BrandMark {
  bg: string;
  lines: MarkLine[];
}

/**
 * Approximated OTT brand marks.
 *
 * These are styled text stand-ins, NOT the real trademarks. They exist so the
 * screens read correctly during the demo. Swap in the licensed logo artwork
 * before any store release — only the `MARKS` map below needs to change, or
 * pass `imageUrl` to render a real asset instead.
 */
@Component({
  selector: 'app-ott-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mark" [style.width.px]="size" [style.height.px]="size"
         [style.background]="mark().bg" [style.border-radius.px]="radius">
      <img *ngIf="imageUrl; else textMark" [src]="imageUrl" [alt]="brand" />
      <ng-template #textMark>
        <span *ngFor="let l of mark().lines"
              [style.color]="l.color || '#fff'"
              [style.font-size.px]="size * (l.size || 0.22)"
              [style.font-weight]="l.weight || 900"
              [style.letter-spacing]="l.spacing || 'normal'"
              [style.font-style]="l.italic ? 'italic' : 'normal'"
              [style.text-transform]="l.transform || 'none'">{{ l.text }}</span>
      </ng-template>
    </div>
  `,
  styles: [`
    .mark {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      line-height: 1.05; overflow: hidden; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    }
    .mark img { width: 100%; height: 100%; object-fit: contain; }
    .mark span { white-space: nowrap; }
  `],
})
export class OttLogoComponent implements OnChanges {
  @Input() brand = '';
  @Input() size = 48;
  @Input() radius = 10;
  /** When the licensed artwork is available, pass it here and it wins. */
  @Input() imageUrl?: string;

  private static readonly MARKS: Record<string, BrandMark> = {
    netflix:   { bg: '#000000', lines: [{ text: 'NETFLIX', color: '#E50914', size: 0.17, spacing: '-0.5px' }] },
    prime:     { bg: '#1399FF', lines: [
                   { text: 'prime', color: '#fff', size: 0.22 },
                   { text: 'video', color: '#fff', size: 0.22 }] },
    hotstar:   { bg: '#0C1B33', lines: [{ text: 'hotstar', color: '#fff', size: 0.20 }] },
    zee5:      { bg: '#000000', lines: [{ text: 'ZEE5', color: '#fff', size: 0.24, spacing: '0.5px' }] },
    sonyliv:   { bg: '#000000', lines: [
                   { text: 'SONY', color: '#fff', size: 0.17, spacing: '1px' },
                   { text: 'liv',  color: '#E91E63', size: 0.22 }] },
    voot:      { bg: '#3B1E78', lines: [{ text: 'voot', color: '#fff', size: 0.26 }] },
    aha:       { bg: '#101010', lines: [{ text: 'aha', color: '#F97316', size: 0.30 }] },
    discovery: { bg: '#0B0B0B', lines: [{ text: 'discovery+', color: '#fff', size: 0.145 }] },
    appletv:   { bg: '#0B0B0B', lines: [{ text: 'tv+', color: '#fff', size: 0.26 }] },
    sunnxt:    { bg: '#BE123C', lines: [
                   { text: 'SUN', color: '#fff', size: 0.19, spacing: '0.5px' },
                   { text: 'NXT', color: '#fff', size: 0.19, spacing: '0.5px' }] },
    hoichoi:   { bg: '#0B0B0B', lines: [{ text: 'hoichoi', color: '#DC2626', size: 0.185 }] },
    lionsgate: { bg: '#0B0B0B', lines: [
                   { text: 'LIONSGATE', color: '#EAB308', size: 0.135, spacing: '0.3px' },
                   { text: 'PLAY',      color: '#EAB308', size: 0.135, spacing: '0.3px' }] },
    spotify:   { bg: '#1DB954', lines: [{ text: 'Spotify', color: '#fff', size: 0.18 }] },
  };

  private resolved: BrandMark = { bg: '#1565C0', lines: [{ text: '?', size: 0.4 }] };

  mark(): BrandMark { return this.resolved; }

  ngOnChanges() {
    this.resolved = OttLogoComponent.MARKS[this.brand?.toLowerCase()] ?? {
      bg: '#1565C0',
      lines: [{ text: (this.brand?.[0] ?? '?').toUpperCase(), size: 0.42 }],
    };
  }
}