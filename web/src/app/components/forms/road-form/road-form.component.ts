import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core'; // dodaj OnInit
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoadService } from '../../../services/road.service';
import { DrawModeService } from '../../../services/draw-mode.service'; // za brisanje forme
import { Road } from '../../../models/roads';
import { ChangeDetectorRef } from '@angular/core';
import { WktGeometryTransferService } from '../../../services/wkt-geometry-transfer.service'; 
import { Subscription } from 'rxjs';
import { NgZone } from '@angular/core'; // to služi za temu, da se izognemo napaki "ExpressionChangedAfterItHasBeenCheckedError" pri Angularju
import { Inject } from '@angular/core';
import { EventService } from '../../../services/event.service';
import { EventModel } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';
// import { LoginFormComponent } from '../login-form/login-form.component';
import { WKT } from 'ol/format';

@Component({
  selector: 'app-road-form',
  standalone: true,
  imports: [
     CommonModule, 
     FormsModule
  ],
  templateUrl: './road-form.component.html',
  styleUrl: './road-form.component.scss'
})
export class RoadFormComponent implements OnInit, OnDestroy {
   @Output() saved = new EventEmitter<void>();
   @Output() statusMessage = new EventEmitter<string>();

   road: Road = new Road(0, '', '', '', 0, '');
   private wktSubscription!: Subscription;

   constructor(
     private roadService: RoadService,
     private drawModeService: DrawModeService,   // za brisanje forme
     private cdRef: ChangeDetectorRef,
     public eventService: EventService,
     @Inject(WktGeometryTransferService) private wktService: WktGeometryTransferService, // Za prenos WKT grafike
     private ngZone: NgZone,        // zaznava spremembe v geom_wkt, iz leaflet karte, ki je izven Angular konteksta
     private authService: AuthService,
     private dialog: MatDialog
   ) {}

   
   ngOnInit(): void {
     this.wktSubscription = this.wktService.getGeometryUpdates().subscribe((payload) => {
      if (payload.type === 'road') {
        console.log('[Road-form] RoadFormComponent prejel WKT:', payload.wkt);
        this.road.geom_wkt = payload.wkt;
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });

    this.drawModeService.clearForm$.subscribe(() => {
        this.clearForm();
    });       
    
    // Dogodek iz eventService
    this.eventService.eventActivated$.subscribe(event => {
      if (event.type === 'road-selected') {
        const podatki = event.data;
        this.road.id = podatki.id;
        this.road.str_name = podatki.str_name;
        this.road.administrator = podatki.administrator;
        this.road.maintainer = podatki.maintainer;
        this.road.length = podatki.length;
        this.road.geom_wkt = podatki.geom_wkt;
        console.log('[road-form] Prejel road-selected event:', podatki);
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });

    // Dogodek iz eventService. Prejeli smo obvestilo, da je bila editirana cesta, in samo napolnimo polje z WKT vsebino
    this.eventService.eventActivated$.subscribe(event => {
      if (event.type === 'roadEdited') {
        const podatki = event.data;
        console.log('[Road-form] PREJEL event roadEdited s podatki:', podatki);
        console.log('[Road-form] geom_wkt =', podatki.geom_wkt);
        this.road.id = podatki.id;
        this.road.str_name = podatki.str_name;
        this.road.administrator = podatki.administrator;
        this.road.maintainer = podatki.maintainer;
        this.road.length = podatki.length;
        // Če geom_wkt ni string, ga pretvori
        if (podatki.geom_wkt && typeof podatki.geom_wkt !== 'string') {
          // Poskušaj ročno serializirati v string
          this.road.geom_wkt = JSON.stringify(podatki.geom_wkt);
          console.warn('[Road-form] geom_wkt ni string, je pretvorjen:', this.road.geom_wkt);
        } else {
          this.road.geom_wkt = podatki.geom_wkt;
        }
        console.log('[Road-form] Prejel roadEdited event:', podatki);
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });
  }


  loadGeometryFromWkt(wkt: string): void {
    console.log('[road-form] Nalagam geometrijo iz WKT:', wkt);
    this.road.geom_wkt = wkt;

    // Če je treba prisiliti Angular, da zazna spremembo:
    setTimeout(() => this.cdRef.detectChanges(), 0);
  }


   ngOnDestroy(): void {
     if (this.wktSubscription) {
       this.wktSubscription.unsubscribe();
     }
   }

   saveRecords() {

     // preveri če imaš pravice za shrajevanje cest
     if (!this.authService.ensureCanEdit()) {
       this.statusMessage.emit('You do not have permission to save data.');
      return;
     }

     console.log('[Road-form] Road data:', this.road);  
     const payload = {
       str_name: this.road.str_name,
       administrator: this.road.administrator,
       maintainer: this.road.maintainer,
       length: this.road.length,
       geom: this.road.geom_wkt
     };
     this.roadService.save(payload).subscribe({
       next: (res) => {
         this.statusMessage.emit(JSON.stringify(res));
         this.clearForm();
         this.saved.emit();
       },
       error: (err) => {
         this.statusMessage.emit(JSON.stringify(err.error));
       }
     });
   }


   updateRecords() {

     // preveri če imaš pravice za update cest
     if (!this.authService.ensureCanEdit()) {
        this.statusMessage.emit('You do not have permission to update data.');
        return;
     }

     const payload = {
       str_name: this.road.str_name,
       administrator: this.road.administrator,
       maintainer: this.road.maintainer,
       length: this.road.length,
       geom: this.road.geom_wkt
     };
     this.roadService.update(this.road.id, payload).subscribe({
       next: (res) => {
         this.statusMessage.emit(JSON.stringify(res));;
         this.clearForm();
         this.saved.emit();
       },
       error: (err) => {
         this.statusMessage.emit(JSON.stringify(err.error));
       }
     });
   }

   setUpdate(data: Partial<Road>): void {
     this.road = new Road(
       data.id ?? 0,
       data.str_name ?? '',
       data.administrator ?? '',
       data.maintainer ?? '',
       data.length ?? 0,
       data.geom_wkt ?? data.geom ?? ''
     );
   }

   public clearForm(): void {
     this.road = new Road(0, '', '', '', 0, '');
   }

   onWktChange(wkt: string): void {
     alert('Funkcija se kliče');
     console.log('[Road-form] Prejel WKT iz mape:', wkt);
     this.road.geom_wkt = wkt;
   }
}

