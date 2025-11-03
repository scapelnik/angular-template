import { Component, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DrawModeService, DrawMode } from '../../services/draw-mode.service';
import { LoginFormComponent } from '../forms/login-form/login-form.component';
import { LogoutFormComponent } from '../forms/logout-form/logout-form.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    MatButtonModule,
    RouterLink,
    CommonModule,
    LoginFormComponent,
    LogoutFormComponent
  ],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent {
  // Posodobi vrednosti, da se ujemajo z AppComponent
  @Output() formSelected = new EventEmitter<'parcel' | 'building' | 'road' | 'address'>();

  constructor(private drawModeService: DrawModeService,
              private dialog: MatDialog,
              public authService: AuthService
  ) {}

  select(type: 'parcel' | 'building' | 'road' | 'address') {
    this.formSelected.emit(type);
    // Nastavimo DrawModeService glede na izbiro
    if (type === 'parcel' || type === 'building' || type === 'road' || type === 'address') {
      this.drawModeService.setMode(type);
      console.log(`Draw mode set to: ${type}`);
    }
  }

  openAbout() {
  window.open('/about.html', '_blank');
}

  openLoginDialog() {
    const dialogRef = this.dialog.open(LoginFormComponent, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(() => {
    // Preusmeri na login-form po zaprtju logout modala
    // window.location.href = '/login-form'; // Sem zakomentiral, ne želim reloadati strani
  });
  }

  openLogoutDialog() {
    this.dialog.open(LogoutFormComponent, {
      width: '300px'
    });
  }
}