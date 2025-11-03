import { Component, EventEmitter, Output, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuildingService } from '../../../services/building.service';
import { DrawModeService } from '../../../services/draw-mode.service';
import { Building } from '../../../models/building';
import { ChangeDetectorRef } from '@angular/core';
import { WktGeometryTransferService } from '../../../services/wkt-geometry-transfer.service'; 
import { Subscription } from 'rxjs';
import { Inject } from '@angular/core';
import { NgZone } from '@angular/core';
import { EventService } from '../../../services/event.service';
import { EventModel } from '../../../models/event.model';   
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';


@Component({
  standalone: true,
  selector: 'app-building-form',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './building-form.component.html',
  styleUrls: ['./building-form.component.scss']
})
export class BuildingFormComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();
  @Output() statusMessage = new EventEmitter<string>();

  building: Building = new Building( '', 0, 0, '', 0, '');
  private wktSubscription!: Subscription;

  constructor(
    private buildingService: BuildingService,
    private drawModeService: DrawModeService,
    private cdRef: ChangeDetectorRef,
    public eventService: EventService,
    @Inject(WktGeometryTransferService) private wktService: WktGeometryTransferService, // Za prenos WKT grafike
    private ngZone: NgZone,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // WKT iz storitve
    this.wktSubscription = this.wktService.getGeometryUpdates().subscribe((payload) => {
      if (payload.type === 'building') {
        console.log('[Building-form] BuildingFormComponent prejel WKT:', payload.wkt);
        this.building.geom_wkt = payload.wkt;
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });

    // Dogodek iz eventService
    this.eventService.eventActivated$.subscribe(event => {
      if (event.type === 'building-selected') {
        const podatki = event.data;
        this.building.id = podatki.id;
        this.building.description = podatki.description,
        this.building.sifko = podatki.sifko,
        this.building.st_stavbe = podatki.st_stavbe,
        this.building.area = podatki.area,
        this.building.geom_wkt = podatki.geom_wkt;
        console.log('[Building-form] Prejel building-selected event:', event.data);
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });

    // Dogodek iz eventService. Prejeli smo obvestilo, da je bila editirana stavba, in samo napolnimo polje z WKT vsebino
    this.eventService.eventActivated$.subscribe(event => {
      if (event.type === 'buildingEdited') {
        const podatki = event.data;
        this.building.id = podatki.id;
        this.building.description = podatki.description;
        this.building.sifko = podatki.sifko;
        this.building.st_stavbe = podatki.st_stavbe;
        this.building.area = podatki.area;
        // Če geom_wkt ni string, ga pretvori
        if (podatki.geom_wkt && typeof podatki.geom_wkt !== 'string') {
          // Poskušaj ročno serializirati v string
          this.building.geom_wkt = JSON.stringify(podatki.geom_wkt);
          console.warn('[Building-form] geom_wkt ni string, je pretvorjen:', this.building.geom_wkt);
        } else {
          this.building.geom_wkt = podatki.geom_wkt;
        }
        console.log('[Building-form] Prejel buildingEdited event:', podatki);
        setTimeout(() => this.cdRef.detectChanges(), 0);
      }
    });
  }

  loadGeometryFromWkt(wkt: string): void {
    console.log('[Building-form] Nalagam geometrijo iz WKT:', wkt);
    this.building.geom_wkt = wkt;

    // Če je treba prisiliti Angular, da zazna spremembo:
    setTimeout(() => this.cdRef.detectChanges(), 0);
  }

  ngOnDestroy(): void {
    if (this.wktSubscription) {
      this.wktSubscription.unsubscribe();
    }
  }


  saveRecords() {

    // preveri če imaš pravice za shrajevanje
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to save data.');
      return;
    }

    console.log('[Building-form] Building data za knjiženje:', this.building);
    const payload = {
      id: this.building.id,
      description: this.building.description,
      sifko: this.building.sifko,
      st_stavbe: this.building.st_stavbe,
      area: this.building.area,
      geom: this.building.geom_wkt
    };

    this.buildingService.save(payload).subscribe({
      next: (res) => {
        this.statusMessage.emit(JSON.stringify(res));
        console.log('[Building-form] Django response: ', res);
        this.clearForm();
        this.saved.emit();
      },
      error: (err) => {
        this.statusMessage.emit(JSON.stringify(err.error));
      }
    });
  }



  updateRecords() {
    // preveri če imaš pravice za update stavb
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to update data.');
      return;
   }

    const payload = {
      id: this.building.id,
      description: this.building.description,
      sifko: this.building.sifko,
      st_stavbe: this.building.st_stavbe,
      area: this.building.area,
      geom: this.building.geom_wkt
    };

    this.buildingService.update(this.building.id, payload).subscribe({
      next: (res) => {
        this.statusMessage.emit(res?.message || 'Building updated successfully');
        this.clearForm();
        this.saved.emit();
      },
      error: (err) => {
        this.statusMessage.emit(JSON.stringify(err.error));
      }
    });
  }
  

  setUpdate(data: Partial<Building>): void {
    this.building = new Building(
      data.id ?? '',
      data.sifko ?? 0,                    // če je različno od 0 se spremeni, drugače se ne spreminja
      data.st_stavbe ?? 0,
      data.description ?? '',             // če ima vrednost se spreminja, sicer ne , na začetku so noter te vrednosti: ('', 0, 0, '', 0, ''), potem pa vnašamo podatke ...
      data.area ?? 0,
      data.geom_wkt ?? data.geom ?? ''
    );
  }

  public clearForm(): void {
    this.building = new Building('', 850, 0, '', 0, '');
  }

  onWktChange(wkt: string): void {
    alert('Funkcija se kliče');
    console.log('[Building-form] Prejel WKT iz mape:', wkt);
    this.building.geom_wkt = wkt;
  }
}