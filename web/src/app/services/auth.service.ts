// ------------------------------------------------------------------------------
// je profesorjev servis, ki se uporablja za ugotavljanje ali smo logirani ali ne.
// klicanj je iz login forme.
// -------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ServerAnswerModel } from '../models/server-answer.model';
import { MatDialog } from '@angular/material/dialog';
import { LoginFormComponent } from '../components/forms/login-form/login-form.component'; 
import { LogoutFormComponent } from '../components/forms/logout-form/logout-form.component'; 
import { transformExtentWithOptions } from 'ol/format/Feature';
import { BehaviorSubject } from 'rxjs';  // za obvestila v statusni vrstici. Običajni emit ne deluje v servisih!
import { HttpClient } from '@angular/common/http';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public username: string = '';
  public isAuthenticated: boolean = false;
  public userGroups: string[] = [];
  private statusMessageSubject = new BehaviorSubject<string>('');
  public statusMessage$ = this.statusMessageSubject.asObservable();

  constructor(
    public settingsService:SettingsService,
    public apiService: ApiService,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    //  this.checkIsLoggedInInServer();    // Po default se ne bomo kar prijavljali, ampak bomo preverili, če smo že prijavljeni
  }

  
  
  // #initCsrfToken() {
  //   this.http.get(this.settingsService.API_URL+'core/csrf/', { withCredentials: true })
  //     .subscribe(() => console.log('[AuthService] CSRF token pridobljen'));
  // }




  checkIsLoggedInInServer(): Observable<any> {
    console.log('[AuthService] Checking login status...');
    return this.apiService.get('core/check-login/').pipe(
      tap(response => {
        console.log('[AuthService] Response:', response);
        if (response.ok) {
          this.username = response.data[0]?.username || '';
          this.userGroups = (response.data[0]?.groups || []).map((g: string) => g.toLowerCase());  //imena skupin so v malih črkah
          this.isAuthenticated = true;
          console.log('[AuthService] Logged in as:', this.username, 'Groups:', this.userGroups);

          // v statusno vrstico pošljemo sporočilo o uspešni prijavi
          this.statusMessageSubject.next('You are logged in as ' + this.username + '. You are a member of groups: ' + this.userGroups.join(', '));
      
        } else {
          this.username = '';
          this.userGroups = [];
          this.isAuthenticated = false;
          console.log('[AuthService] Not logged in');
        }
      })
    );
  }



  public ensureCanEdit(): boolean {
    if (this.hasGroup('editors', 'admins')) {
      return true;
    }
    // Samodejna odjava uporabnika v ozadju
    this.apiService.post('core/logout/', {}).subscribe({
      next: () => {
        // Po uspešni odjavi resetiraj auth podatke
        this.username = '';
        this.isAuthenticated = false;
        this.userGroups = [];

        // Nato prikaži login modal
        this.dialog.open(LoginFormComponent, {
          disableClose: false,
          data: { reason: 'edit' }
        });
      },
      error: (error) => {
        console.error('[ensureCanEdit] Napaka pri avtomatski odjavi:', error);
        // V vsakem primeru pokažemo login
        this.dialog.open(LoginFormComponent, {
          disableClose: false,
          data: { reason: 'edit' }
        });
      }
    });
    return false;
  }


  // za logout uporabnika s premalo pravicami, da se sploh ne prikaže okno za logout
  public logout(): Observable<any> {
    return this.apiService.post('core/logout/', {}).pipe(
      tap(() => {
        this.username = '';
        this.isAuthenticated = false;
        this.userGroups = [];
      })
    );
  }



  hasGroup(...groups: string[]): boolean {
    return groups.some(group => this.userGroups.includes(group));
  }

}