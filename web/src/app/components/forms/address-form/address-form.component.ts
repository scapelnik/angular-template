import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddressService } from '../../../services/address.service';
import { DrawModeService } from '../../../services/draw-mode.service';
import { Address } from '../../../models/address';
import { ChangeDetectorRef } from '@angular/core';
import { WktGeometryTransferService } from '../../../services/wkt-geometry-transfer.service'; 
import { Subscription } from 'rxjs';
import { Inject } from '@angular/core';
import { NgZone } from '@angular/core'; // to služi za temu, da se izognemo napaki "ExpressionChangedAfterItHasBeenCheckedError" pri Angularju
import { EventService } from '../../../services/event.service';
import { EventModel } from '../../../models/event.model';
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';
import { LoginFormComponent } from '../login-form/login-form.component';

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule
  ],
  templateUrl: './address-form.component.html',
  styleUrl: './address-form.component.scss'
})
export class AddressFormComponent implements OnInit {
   @Output() saved = new EventEmitter<void>();
   @Output() statusMessage = new EventEmitter<string>();

   address: Address = new Address(0, 0, '', '', 0, '', '');  // inicializiramo address objekt
   private wktSubscription!: Subscription;         // prijavimo se na WktService, če se zgodi sprememba geom_wkt iz

  constructor(
     private addressService: AddressService,       // servis za komunikacijo z backendom
     private drawModeService: DrawModeService,    // za brisanje forme
     private cdRef: ChangeDetectorRef,           // za zaznavanje sprememb v Document Object Model (DOM) ne vem če še rabim to!
     public eventService: EventService,         // vključimo profesorjev event-service
     @Inject(WktGeometryTransferService) private wktService: WktGeometryTransferService, // Za prenos WKT grafike  
     private ngZone: NgZone,
     private authService: AuthService,
     private dialog: MatDialog
   ) {}

  ngOnInit(): void {
     this.wktSubscription = this.wktService.getGeometryUpdates().subscribe((payload) => {
      if (payload.type === 'address') {
        console.log('AddressFormComponent prejel WKT:', payload.wkt);
        this.address.geom_wkt = payload.wkt;

        setTimeout(() => this.cdRef.detectChanges(), 0);
        }
     });

     // Dogodek iz eventService. Prejeli smo obvestilo, da je bil izbran naslov, in samo napolnimo polje z WKT vsebino
     this.eventService.eventActivated$.subscribe(event => {
       if (event.type === 'address-selected') {   
          const podatki = event.data;
          this.address.id = podatki.id;
          this.address.building_num = podatki.building_num;
          this.address.street = podatki.street;
          this.address.house_num = podatki.house_num;
          this.address.post_num = podatki.post_num;
          this.address.post_name = podatki.post_name;
          this.address.geom_wkt = podatki.geom_wkt;
          console.log('[Address-form] Prejel address-selected event:', podatki);
          console.log('Tip podatki.geom_wkt:', typeof podatki.geom_wkt, podatki.geom_wkt);
          setTimeout(() => this.cdRef.detectChanges(), 0);
       }
     });

     // Dogodek iz eventService. Prejeli smo obvestilo, da je bil editiran naslov, in samo napolnimo polje z WKT vsebino
     this.eventService.eventActivated$.subscribe(event => {
       if (event.type === 'addressEdited') {
          const podatki = event.data;
          // Preveri, ali je podatki objekt z vsemi polji, ne samo string geom_wkt
          if (typeof podatki === 'object' && podatki !== null) {
            this.address.id = podatki.id;
            this.address.building_num = podatki.building_num;
            this.address.street = podatki.street;
            this.address.house_num = podatki.house_num;
            this.address.post_num = podatki.post_num;
            this.address.post_name = podatki.post_name;
            this.address.geom_wkt = podatki.geom_wkt;
            console.log('[Address-form] Prejel addressEdited event:', podatki);
            console.log('Tip podatki.geom_wkt:', typeof podatki.geom_wkt, podatki.geom_wkt);
          } else {
            console.warn('[Address-form] Prejeli smo addressEdited event, a podatki niso objekt:', podatki);
            // Če želiš, lahko tukaj posodobimo samo geom_wkt, če je podatki string:
            if (typeof podatki === 'string') {
              this.address.geom_wkt = podatki;
            }
          }
          setTimeout(() => this.cdRef.detectChanges(), 0);
        }
      });

     this.drawModeService.clearForm$.subscribe(() => {      // naročimo se na spremembo ob zamenjavi forme. Forma se počisti
       this.clearForm();
     });

    //  if (!this.authService.isAuthenticated) {
    //   console.warn('[AddressForm] Dostop zavrnjen ker uporabnik ni prijavljen');
    //   this.dialog.open(LoginFormComponent, {
    //    disableClose: true
    //   });
    // }
  }

  loadGeometryFromWkt(wkt: string): void {
    console.log('[Parcel-form] Nalagam geometrijo iz WKT:', wkt);
    this.address.geom_wkt = wkt;
  }

  ngOnDestroy(): void {
    if (this.wktSubscription) {
      this.wktSubscription.unsubscribe();
    }
  }

  saveRecords() {

    // preveri če imaš pravice za shrajevanje naslovov
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to save data.');
      return;
    }

    console.log('Address data za knjiženje:', this.address);  
    // Pripravi objekt za pošiljanje, kjer geom vzamemo iz geom_wkt
    const payload = {
      building_num: this.address.building_num,
      street: this.address.street,
      house_num: this.address.house_num,
      post_num: this.address.post_num, 
      post_name: this.address.post_name, 
      geom: this.address.geom_wkt    // ključ "geom" s podatkom iz geom_wkt
    };

    this.addressService.save(payload).subscribe({
      next: (res) => {
        // Prikaži backendovo message polje, če obstaja
        this.statusMessage.emit(JSON.stringify(res));          // dejansko sporočilo od Django
        console.log(res);
        this.clearForm();
        this.saved.emit();
      },
      error: (err) => {
        this.statusMessage.emit(JSON.stringify(err.error));    // dejansko sporočilo od Django
      }
    });
  }


  updateRecords() {

    // preveri če imaš pravice za update naslovov
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to update data.');
      return;
    }

    const payload = {
      building_num: this.address.building_num,
      street: this.address.street,
      house_num: this.address.house_num,
      post_num: this.address.post_num, 
      post_name: this.address.post_name, 
      geom: this.address.geom_wkt    // ključ "geom" s podatkom iz geom_wkt
    };

    this.addressService.update(this.address.id, payload).subscribe({
      next: (res) => {
        this.statusMessage.emit(res?.message ||'Address updated successfully');
        this.clearForm();
        this.saved.emit();
      },
      error: (err) => {
        this.statusMessage.emit(JSON.stringify(err.error));
      }
    });
  }

  setUpdate(data: Partial<Address>): void {
    this.address = new Address(
      data.id ?? 0,
      data.building_num ?? 0,
      data.street ?? '',
      data.house_num ?? '',
      data.post_num ?? 0,
      data.post_name ?? '',
      data.geom_wkt ?? data.geom ?? ''
    );
  }

  public clearForm(): void {     // public, zato, ker jo kličemo tudi iz html, privatne lahko kličem samo v istem fajlu!
    this.address = new Address(0, 0, '', '', 0, '', '');
  }

  onWktChange(wkt: string): void {
    alert('Funkcija se kliče');
    console.log('Prejel WKT iz mape:', wkt);
    this.address.geom_wkt = wkt;
  }


}