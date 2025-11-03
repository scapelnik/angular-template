// ---------------------------------------------------------------------------------------------------------------------------
// To je centralni mehanizem varovanja. Za varovanje uporablja profesorjevo funkcijo: isAuthenticated ki je v auth.service.ts
// Ta mehanizem preverja pravice za dostop pred odprtjem posamezne komponente
// ----------------------------------------------------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';  

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated) {
      console.log('[AuthGuard] Dostop dovoljen.');
      return true;
    } else {
      console.warn('[AuthGuard] Dostop zavrnjen – uporabnik ni prijavljen.');
      this.router.navigate(['/login-form']);
      return false;
    }
  }
}