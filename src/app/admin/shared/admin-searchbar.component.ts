import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { searchOutline, calendarOutline, listOutline, swapVerticalOutline, chevronDownOutline } from 'ionicons/icons';

export interface FilterChip { key: string; label: string; tone?: 'plain' | 'green' | 'red' | 'yellow'; }

/** Search + Item/Date From/Date To sort row + coloured filter chips.
 *  Repeats on Groups, Wallets, Transactions and Payments in the deck. */
@Component({
  selector: 'app-admin-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon],
  templateUrl: './admin-searchbar.component.html',
  styleUrls: ['./admin-searchbar.component.scss'],
})
export class AdminSearchbarComponent {
  @Input() placeholder = 'Search...';
  @Input() showSort = true;
  @Input() sortLabel = 'Item';
  @Input() chips: FilterChip[] = [];
  @Input() activeChip = '';

  @Input() term = '';
  @Output() termChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() chipChange = new EventEmitter<string>();
  @Output() sort = new EventEmitter<void>();
  @Output() dateFrom = new EventEmitter<void>();
  @Output() dateTo = new EventEmitter<void>();

  constructor() {
    addIcons({ searchOutline, calendarOutline, listOutline, swapVerticalOutline, chevronDownOutline });
  }

  onTerm(v: string) { this.term = v; this.termChange.emit(v); }
}