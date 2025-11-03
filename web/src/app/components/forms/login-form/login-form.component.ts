import { Component } from '@angular/core';

//To use forms 
//  Import in the imports on the component the following
import { ReactiveFormsModule } from '@angular/forms';
import {MatInputModule} from "@angular/material/input";//angular material must be installed before
import { MatTooltip } from '@angular/material/tooltip';
import {MatCardModule} from '@angular/material/card';
import { CommonModule } from '@angular/common';

//To use the controls in the component
//  Import in the imports on the component the following
import {FormControl} from '@angular/forms';
import {FormGroup, Validators} from '@angular/forms';
import { ServerAnswerModel } from '../../../models/server-answer.model';
import { ApiService } from '../../../services/api.service';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../services/auth.service';
import { MatDialogRef } from '@angular/material/dialog';   // za login modalno okno, da se bo zaprlo


@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [MatInputModule, ReactiveFormsModule, MatTooltip, MatButtonModule, CommonModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss'
})
export class LoginFormComponent {
  serverMessage = '';
  //Form component creation
  username = new FormControl('', [Validators.required,Validators.minLength(4)]);
  password =  new FormControl('', [Validators.required,Validators.minLength(4)]);

  //Create a form group to eval the data at once
  controlsGroup = new FormGroup({
    username: this.username,
    password: this.password,
  })

  //Pay attention to::
  //  - Services must be injected in the constructor
  //  - Services are not imported in the component, in the imports array
  constructor(
    private dialogRef: MatDialogRef<LoginFormComponent>,    // da se bo login okno zaprlo
    private apiService:ApiService, 
    private authService: AuthService
  ){}


  
  login() {
    console.log('[login-form] Login triggered!');
    this.serverMessage = '';

    this.apiService.post('core/login/', this.controlsGroup.value).subscribe({
      next: (response: any) => {
        console.log('[login-form] Received response:', response);

        // Robustno preverjanje
        if (response && response.ok) {
          console.log('[login-form] Login success:', response);
          this.authService.username = this.username.value!;
          this.authService.isAuthenticated = true;

          // Ponovno preveri stanje s strežnikom
          this.authService.checkIsLoggedInInServer().subscribe();

          // Počakamo 2 sekundi, da si uporabnik prebere sporočilo
          setTimeout(() => {
            this.dialogRef.close(true); // zapri modal
          }, 1000);
        } else {
          console.warn('[login-form] Response OK is false or missing:', response);
        }

        this.serverMessage = response.message || 'Unknown response.';
      },
      error: (error: any) => {
        console.error('[login-form] Login failed:', error);
        this.serverMessage = error.error?.message || 'Login failed.';
      }
    });
  }
  

  /*
  login() {
    console.log('[login-form] Login triggered!');
    this.serverMessage = '';

    const csrfToken = this.getCsrfTokenFromCookie();

    this.apiService.post('core/login/', this.controlsGroup.value, {
      withCredentials: true,
      headers: {
        'X-CSRFToken': csrfToken
      }
    }).subscribe({
      next: (response: any) => {
        console.log('[login-form] Received response:', response);

        if (response && response.ok) {
          this.authService.username = this.username.value!;
          this.authService.isAuthenticated = true;
          this.authService.checkIsLoggedInInServer().subscribe();

          setTimeout(() => {
            this.dialogRef.close(true);
          }, 1000);
        } else {
          console.warn('[login-form] Response OK is false or missing:', response);
        }

        this.serverMessage = response.message || 'Unknown response.';
      },
      error: (error: any) => {
        console.error('[login-form] Login failed:', error);
        this.serverMessage = error.error?.message || 'Login failed.';
      }
    });
  }
  */

  // preberi CSRF žeton iz cooki-ja
  // getCsrfTokenFromCookie(): string {
  //   const name = 'csrftoken=';
  //   const decodedCookie = decodeURIComponent(document.cookie);
  //   const ca = decodedCookie.split(';');
  //   for (let i = 0; i < ca.length; i++) {
  //     let c = ca[i].trim();
  //     if (c.indexOf(name) === 0) {
  //       return c.substring(name.length, c.length);
  //     }
  //   }
  //   return '';
  // }


}
