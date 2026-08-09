import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, optionsOutline, menuOutline, downloadOutline } from 'ionicons/icons';

/** Back / Money-Saver logo / right action. Right action is the green Excel
 *  export on data screens, the filter glyph on CMS screens. */
@Component({
  selector: 'app-admin-header',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: './admin-header.component.html',
  styleUrls: ['./admin-header.component.scss'],
})
export class AdminHeaderComponent {
  @Input() title = '';
  @Input() leading: 'back' | 'menu' = 'back';
  @Input() trailing: 'excel' | 'options' | 'none' = 'options';

  @Output() menu = new EventEmitter<void>();
  @Output() excel = new EventEmitter<void>();
  @Output() options = new EventEmitter<void>();

  constructor(private location: Location) {
    addIcons({ arrowBackOutline, optionsOutline, menuOutline, downloadOutline });
  }

  back() { this.location.back(); }
}