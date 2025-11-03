import { Component } from '@angular/core';
//To use forms 
//  Import in the imports on the component the following

import { MatButtonModule } from '@angular/material/button';

//To use the controls in the component
//  Import in the imports on the component the following
import { ServerAnswerModel } from '../../../models/server-answer.model';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { MatDialogRef } from '@angular/material/dialog';   // za login modalno okno, da se bo zaprlo

@Component({
  selector: 'app-logout-form',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './logout-form.component.html',
  styleUrl: './logout-form.component.scss'
})
export class LogoutFormComponent {
  serverMessage = '';
  constructor(
    private router: Router, 
    private apiService:ApiService, 
    private authService: AuthService,
    private dialogRef: MatDialogRef<LogoutFormComponent>
  ){}

  
  logout(){                                               // logout brez CSRF token
    console.log('[Logout] Logout triggered');
    this.apiService.post('core/logout/', {}).subscribe({
          next: (response: ServerAnswerModel) => {
            console.log('[Logout] Server response:', response);
            if (response.ok){
              this.authService.username = '';
              this.authService.isAuthenticated = false;
              this.authService.userGroups = [];
              this.authService.checkIsLoggedInInServer();
              console.log('[Logout] Uporabnik odjavljen !');

              this.dialogRef.close();

            }
            this.serverMessage=response.message;
          },
          error: (error:any)=>{
            console.error('[Logout] Napaka pri odjavi:', error.description);
          }
        })//subscribe
  }


  // logout() {                                                  // logout z CSRF token
  //   console.log('[Logout] Logout triggered');
  //
  //   const csrfToken = this.getCsrfTokenFromCookie();
  //
  //  this.apiService.post('core/logout/', {}, {
  //    withCredentials: true,
  //    headers: {
  //      'X-CSRFToken': csrfToken
  //    }
  //  }).subscribe({
  //    next: (response: ServerAnswerModel) => {
  //      console.log('[Logout] Server response:', response);
  //      if (response.ok) {
  //        this.authService.username = '';
  //        this.authService.isAuthenticated = false;
  //        this.authService.userGroups = [];
  //        this.authService.checkIsLoggedInInServer();
  //        console.log('[Logout] Uporabnik odjavljen !');
  //        this.dialogRef.close();
  //      }
  //      this.serverMessage = response.message;
  //    },
  //    error: (error: any) => {
  //      console.error('[Logout] Napaka pri odjavi:', error);
  //    }
  //  });
  // }


}