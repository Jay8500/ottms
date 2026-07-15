import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

export interface UserProfile {
  id: string;
  name: string;
  uniqueNumber: number;
  mobile: string;
  email: string;
  nickName: string;
  role: 'user' | 'admin';
  isSeller: boolean;
  walletAmount: number;
  lockedAmount: number;
  unlockedAmount: number;
  avatarUrl?: string;
}

const STORAGE_KEY = 'ms_user';

@Injectable({ providedIn: 'root' })
export class Auth {
  private _user = new BehaviorSubject<UserProfile | null>(null);
  user$ = this._user.asObservable();

  get currentUser(): UserProfile | null { return this._user.getValue(); }
  get isLoggedIn(): boolean { return !!this._user.getValue(); }
  get role(): 'user' | 'admin' | null { return this._user.getValue()?.role ?? null; }
  get isSeller(): boolean { return this._user.getValue()?.isSeller ?? false; }

  setUser(profile: UserProfile): void {
    this._user.next(profile);
    // Save to both Capacitor Preferences (mobile) and localStorage (web)
    Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(profile) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }

  async loadFromStorage(): Promise<void> {
    try {
      // Try Capacitor Preferences first (mobile)
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        this._user.next(JSON.parse(value));
        return;
      }
    } catch {}
    // Fallback to localStorage (web browser)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this._user.next(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  toggleSellerMode(isSeller: boolean): void {
    const user = this.currentUser;
    if (!user) return;
    const updated = { ...user, isSeller };
    this.setUser(updated);
  }

  async logout(): Promise<void> {
    this._user.next(null);
    await Preferences.remove({ key: STORAGE_KEY });
    localStorage.removeItem(STORAGE_KEY);
  }
}
