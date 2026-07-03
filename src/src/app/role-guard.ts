import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Auth} from './auth';
 export class RoleGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}
 
  canActivate(route: ActivatedRouteSnapshot): boolean {
    const required = route.data['role'];
    const actual = this.auth.role;
    if (actual === required) return true;
    // redirect to the correct role's home
    this.router.navigate([`/${actual}`]);
    return false;
  }
}
