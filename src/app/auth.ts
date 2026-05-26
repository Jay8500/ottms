import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
 
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
 
@Injectable({
  providedIn: 'root',
})
export class Auth {
 private _user = new BehaviorSubject<UserProfile | null>(null);
  user$ = this._user.asObservable();
 
  get currentUser(): UserProfile | null {
    return this._user.getValue();
  }
 
  get isLoggedIn(): boolean {
    return !!this._user.getValue();
  }
 
  get role(): 'user' | 'admin' | null {
    return this._user.getValue()?.role ?? null;
  }
 
  get isSeller(): boolean {
    return this._user.getValue()?.isSeller ?? false;
  }
 
  // Call this after your HTTP login API responds
  setUser(profile: UserProfile): void {
    this._user.next(profile);
    localStorage.setItem('ms_user', JSON.stringify(profile));
  }
 
  loadFromStorage(): void {
    const stored = localStorage.getItem('ms_user');
    if (stored) {
      try {
        this._user.next(JSON.parse(stored));
      } catch {
        localStorage.removeItem('ms_user');
      }
    }
  }
 
  toggleSellerMode(isSeller: boolean): void {
    const user = this.currentUser;
    if (!user) return;
    const updated = { ...user, isSeller };
    this._user.next(updated);
    localStorage.setItem('ms_user', JSON.stringify(updated));
  }
 
  logout(): void {
    this._user.next(null);
    localStorage.removeItem('ms_user');
  } 
}
