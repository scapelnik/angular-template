import { Component, Input, Output, EventEmitter, AfterViewInit, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuildingService } from '../../../services/building.service';
import { MapService } from '../../../services/map.service'; 
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';
import { EventService } from '../../../services/event.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-building-table',
  imports: [CommonModule, FormsModule],
  templateUrl: './building-table.component.html',
  styleUrls: [ './building-table.component.scss']
})
export class BuildingTableComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() statusMessage = new EventEmitter<string>();
  @Output() editBuilding = new EventEmitter<any>();   // emiter za posodobitev stavbe
  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement>;  // za samodejni SCROLL tabele

  BuildingsArray: any[] = [];
  izbira: 'all' | 'one' = 'all';  // spremenljivka za izbiro med vsemi stavbami ali eno stavbo
  inputId: number =1;  // spremenljivka za shranjevanje izbrane stavbe
  selectedBuildingId: number | null = null; // rabim za samodejni SCROLL
  private eventSubscription?: Subscription;
  iskanjeKO: string = '';
  iskanjeStavbe: string = '';

  constructor(
    private buildingService: BuildingService,
    private mapService: MapService,
    private authService: AuthService,
    private dialog: MatDialog,
    public eventService: EventService
  ) {}

  ngOnInit() {
    this.loadBuildings();
  }

  
  ngAfterViewInit() {
    // Počakamo da je view inicializiran, potem šele subscribamo na event
    setTimeout(() => {
      console.log('[building-table], ViewChild initialized:', !!this.scrollContainer);
      
      this.eventSubscription = this.eventService.eventActivated$.subscribe(event => {
        if (event.type === 'building-selected') {
          this.selectedBuildingId = event.data.id;
          console.log('[building-table]Building selected, ID:', this.selectedBuildingId);

          // ChangeDetection + DOM update
          setTimeout(() => {
            this.scrollToSelectedBuilding();
          }, 100);

        } else if (event.type === 'building-deselected') {
          this.selectedBuildingId = null;
        }
      });
    }, 0);
  }


  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }

  // Označimo vrstice v tabeli
  isBuildingSelected(buildingId: any): boolean {
    return String(this.selectedBuildingId) === String(buildingId);
  }

   private scrollToSelectedBuilding(): void {
      console.log('[building-table], scrollToSelectedBuilding called');
      console.log('[building-table], scrollContainer exists:', !!this.scrollContainer);
      
      if (!this.scrollContainer) {
        console.error('[building-table], scrollContainer is still undefined!');
        return;
      }

      const container = this.scrollContainer.nativeElement;
      console.log('[building-table], Container element:', container);
      
      const selectedRow = container.querySelector('tr.selected') as HTMLElement | null;
      console.log('[building-table], Selected row found:', !!selectedRow);

      if (selectedRow) {
        selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[building-table], ✓ Scrolled to selected parcel:', this.selectedBuildingId);
      } else {
        console.warn('[building-table], Selected row not found in DOM');
      }
    }


  loadBuildings() {
    if (this.izbira === 'all') {
      this.buildingService.getAll().subscribe({    // getAll je metoda v building.service.ts
        next: (data: any[]) => {
          this.BuildingsArray = data;
          this.mapService.addAllBuildingsGeoJsonToLayer(data);
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju stavb:', error);
          this.statusMessage.emit('Napaka pri pridobivanju stavb.');
        }
      });
    } else {
      this.buildingService.getOne(this.inputId).subscribe({       // getOne je metoda v building.service.ts
        next: (building: any) => {
          this.BuildingsArray = [building];  // samo ena stavba v tabeli
          this.mapService.addAllBuildingsGeoJsonToLayer([building]);
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju stavbe:', error);
          this.statusMessage.emit(`Stavbaz ID=${this.inputId} ne obstaja.`);
          this.BuildingsArray = [];  // počisti tabelo
        }
      });
    }
  }


  setIzbira(value: 'all' | 'one') {
    this.izbira = value;
    this.loadBuildings();
  }

  onInputIdChange(event: any) {
    this.inputId = Number(event.target.value);
    if (this.izbira === 'one') {
      this.loadBuildings();
    }
  }

  setUpdate(building: any) {
    this.editBuilding.emit(building);  // to se emitira v nadrejeni razred app.component. Glej najprej html... iščeš: (editBuilding)=...
  }



  setDelete(building: any) {
    // preverimo ali imamo pravice za brisanje stavb, torej ali smo v grupi editors ali admin
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to delete data.');
    return;
    }

    this.buildingService.delete(building.id).subscribe({
      next: () => {
        // Namesto alerta pošljemo sporočilo v statusno vrstico
        this.statusMessage.emit('Building deleted successfully');
        this.loadBuildings();
      },
      error: (error) => {
        console.error('Napaka pri brisanju stavbe:', error);
        this.statusMessage.emit('Napaka pri brisanju stavbe.');
      }
    });
  }

  drawBuildingGeometry(building: any) {
    console.log('[drawBuildingGeometry] Building:', building);
    if (!building?.geom_geojson) {
      console.warn('[drawBuildingGeometry] geom_geojson manjka!');
      return;
    }
    this.mapService.addBuildingsGeoJsonToLayer(building.geom_geojson);
  }


  // iščemo parcelo po tabeli na podlagi vnosnih polj KO + PARC_ST
  isciStavbo() {
    // Če so inputi prazni ali null
    if (this.iskanjeKO == null || this.iskanjeStavbe == null) {
      this.statusMessage.emit("Vnesi obe vrednosti: KO in številko stavbe!");
      alert('Vnesi obe vrednosti: KO in številko stavbe!');
      return;
    }

    // poiščemo ustrezno stavbo
    const najdena = this.BuildingsArray.find(p =>
      p.sifko === this.iskanjeKO &&
      p.st_stavbe === this.iskanjeStavbe
    );

    if (najdena) {
      this.selectedBuildingId = najdena.id;
      setTimeout(() => this.scrollToSelectedBuilding(), 100);
    } else {
      this.statusMessage.emit("Ne najdem stavbe s podanima vrednostma!");
      alert('Ne najdem stavbe s podanima vrednostma.');
    }
  }


}
