import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Auth } from './auth';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const required = route.data['role'];
    const actual = this.auth.role;
    if (actual === required) return true;
    this.router.navigate([`/${actual}`], { replaceUrl: true });
    return false;
  }
}
