import { Injectable } from '@angular/core';

/**
 * CSV export for the green "Excel" buttons across the admin screens.
 *
 * Emits UTF-8 CSV with a BOM so Excel opens it with the right encoding
 * (₹ and Hindi/Telugu text survive). Real .xlsx would need a library —
 * CSV opens natively in Excel and keeps the bundle small.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {

  /**
   * @param filename base name, no extension
   * @param columns  [key, header] pairs, in output order
   * @param rows     any objects carrying those keys
   */
  download<T extends Record<string, any>>(
    filename: string,
    columns: [keyof T & string, string][],
    rows: T[],
  ): void {
    const header = columns.map(c => this.cell(c[1])).join(',');
    const body = rows.map(r => columns.map(c => this.cell(r[c[0]])).join(',')).join('\r\n');
    const csv = '﻿' + header + '\r\n' + body;

    const stamp = new Date().toISOString().slice(0, 10);
    const name = `${filename}-${stamp}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private cell(v: any): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote when the value contains a delimiter, quote or newline.
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
}