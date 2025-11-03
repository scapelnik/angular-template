import { Component, Input, Output, EventEmitter, OnInit, ElementRef, OnDestroy, ViewChild, AfterViewInit  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoadService } from '../../../services/road.service';
import { MapService } from '../../../services/map.service'; 
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';
import { EventService } from '../../../services/event.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
   selector: 'app-road-table',
   standalone: true,
   imports: [CommonModule, FormsModule],
   templateUrl: './road-table.component.html',
   styleUrl: './road-table.component.scss'
})
export class RoadTableComponent implements OnInit, AfterViewInit, OnDestroy {
   @Output() statusMessage = new EventEmitter<string>();    // za sporočila za statusno vrstico
   @Output() editRoad = new EventEmitter<any>();  // se sproži ob kliku na gumb "Uredi" v tabeli, pošlje road objekt v formo
   @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement>;

  RoadsArray: any[] = [];
  izbira: 'all' | 'one' = 'all';  // spremenljivka za izbiro med vsemi cestami ali eno cestoo
  inputId: number =1;  // spremenljivka za shranjevanje izbrane ceste
  selectedRoadId: number | null = null; 
  private eventSubscription?: Subscription;
  filterImeUlice: string = '';
  filtriranArray: any[] = [];

  constructor(
    private roadService: RoadService,
    private mapService: MapService,
    private authService: AuthService,
    private dialog: MatDialog,
    public eventService: EventService
  ) {}

  ngOnInit() {
    this.loadRoads();
  }


  ngAfterViewInit() {
    // Počakamo da je view inicializiran, potem šele subscribamo na event
    setTimeout(() => {
      console.log('[Road table], ViewChild initialized:', !!this.scrollContainer);
      
      this.eventSubscription = this.eventService.eventActivated$.subscribe(event => {
        if (event.type === 'road-selected') {
          this.selectedRoadId = event.data.id;
          console.log('[Road table], Road selected, ID:', this.selectedRoadId);

          // ChangeDetection + DOM update
          setTimeout(() => {
            this.scrollToSelectedRoad();
          }, 100);

        } else if (event.type === 'road-deselected') {
          this.selectedRoadId = null;
        }
      });
    }, 0);
  }

  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }

  // Označimo vrstice v tabeli
  isRoadSelected(roadId: any): boolean {
    return String(this.selectedRoadId) === String(roadId);
  }


  private scrollToSelectedRoad(): void {
    console.log('[Road table], scrollToSelectedRoad called');
    console.log('[Road table], scrollContainer exists:', !!this.scrollContainer);
    
    if (!this.scrollContainer) {
      console.error('[Road table], scrollContainer is still undefined!');
      return;
    }

    const container = this.scrollContainer.nativeElement;
    console.log('[Road table], Container element:', container);
    
    const selectedRow = container.querySelector('tr.selected') as HTMLElement | null;
    console.log('[Road table], Selected row found:', !!selectedRow);

    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('[Road table], ✓ Scrolled to selected road:', this.selectedRoadId);
    } else {
      console.warn('[Road table], Selected row not found in DOM');
    }
  }





  loadRoads() {                               // metoda za nalaganje cest, v odvisnosti od izbire, oz od radion gumbov
    if (this.izbira === 'all') {              // če nalaga vse ceste
      this.roadService.getAll().subscribe({   // getAll je metoda v road.service.ts
        next: (data: any[]) => {
          this.RoadsArray = data;

          this.mapService.addRoadsGeoJsonToLayer(data);
          this.applyFilter();  // Aplicira filter (ali pokaže vse če je filter prazen) 
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju cest:', error);
          this.statusMessage.emit('Napaka pri pridobivanju cest.');
        }
      });
    } else {                               // če nalaga eno cesto
      this.roadService.getOne(this.inputId).subscribe({               // getOne je metoda v road.service.ts
        next: (road: any) => {
          this.RoadsArray = [road];  // samo ena cesta v tabeli
          this.filtriranArray = [road];
          this.mapService.addRoadsGeoJsonToLayer([road]);
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju cest:', error);
          this.statusMessage.emit(`Cesta z ID=${this.inputId} ne obstaja.`);
          this.RoadsArray = [];  // počisti tabelo
          this.filtriranArray = [];
        }
      });
    }
  }

  setIzbira(value: 'all' | 'one') {
    this.izbira = value;
    this.loadRoads();
  }

  onInputIdChange(event: any) {
    this.inputId = Number(event.target.value);
    if (this.izbira === 'one') {
      this.loadRoads();
    }
  }

  setUpdate(road: any) {      // ob kliku na gumb "Uredi" v tabeli se sproži ta metoda in pošlje road objekt v formo
    console.log('RoadTableComponent: setUpdate', road);  // za testiranje
    this.editRoad.emit(road);
  }

  setDelete(road: any) {                            // ob kliku na gumb "Izbriši" v tabeli se sproži ta metoda in izbriše road objekt

    // preverimo ali imamo pravice za brisanje cest, torej ali smo v grupi editors ali admins
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to delete data.');
    return;
    }

    this.roadService.delete(road.id).subscribe({
      next: () => {
        // Namesto alerta, ki odpre novo okno,  pošljemo raje sporočilo v statusno vrstico
        this.statusMessage.emit('Road deleted successfully');
        this.loadRoads();
      },
      error: (error) => {
        //console.error('Napaka pri brisanju ceste.', error);      // samo za testiranje
        this.statusMessage.emit('Error deleting road:');           // sporočilo za statusno vrstico
      }
    });
  }


  drawRoadGeometry(road: any) {
    console.log('[drawRoadGeometry] Road:', road);
    if (!road?.geom_geojson) {
      console.warn('[drawRoadGeometry] geom_geojson manjka!');
      return;
    }
    this.mapService.addOneRoadGeoJsonToLayer(road.geom_geojson);
  }



  // Nova metoda za filtriranje
  applyFilter() {
    if (!this.filterImeUlice || this.filterImeUlice.trim() === '') {
      // Če je filter prazen, prikaži vse
      this.filtriranArray = this.RoadsArray;
    } else {
      // Filtriraj po imenu ulice (case-insensitive)
      this.filtriranArray = this.RoadsArray.filter(road => 
        road.str_name?.toLowerCase().includes(this.filterImeUlice.toLowerCase())
      );
    }
    
    // Posodobi karto z filtriranimi cestami
    this.mapService.addRoadsGeoJsonToLayer(this.filtriranArray);
    
    // Sporočilo če ni rezultatov
    if (this.filtriranArray.length === 0 && this.filterImeUlice) {
      this.statusMessage.emit(`Ni cest z imenom "${this.filterImeUlice}"`);
    } else if (this.filtriranArray.length > 0 && this.filterImeUlice) {
      this.statusMessage.emit(`Najdenih ${this.filtriranArray.length} cest`);
    }
  }

  // Funkcija ki se kliče ob kliku na gumb "Išči"
  filtrirajImeUlice() {
    this.filterImeUlice = this.filterImeUlice.trim();  // Odstrani morebitne presledke
    this.applyFilter();    // kličemo funkcijo nad to funkcijo...
  }

  // Metoda za čiščenje filtra
  clearFilter() {
    this.filterImeUlice = '';
    this.applyFilter();
  }



}

