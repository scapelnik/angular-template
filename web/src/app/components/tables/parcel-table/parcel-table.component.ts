import { Component, Output, EventEmitter, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParcelService } from '../../../services/parcel.service';
import { MapService } from '../../../services/map.service'; 
import { AuthService } from '../../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { EventService } from '../../../services/event.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-parcel-table',
  imports: [CommonModule, FormsModule],
  templateUrl: './parcel-table.component.html',
  styleUrls: ['./parcel-table.component.scss']
})
export class ParcelTableComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @Output() statusMessage = new EventEmitter<string>();
  @Output() editParcel = new EventEmitter<any>();
  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement>;

  ParcelsArray: any[] = [];
  izbira: 'all' | 'one' = 'all'; 
  inputId: number = 1;  
  selectedParcelId: number | null = null; 
  private eventSubscription?: Subscription;
  iskanjeKO: string = '';
  iskanjeParc: string = '';

  constructor(
    private parcelService: ParcelService,
    private mapService: MapService,
    private authService: AuthService,
    private dialog: MatDialog,
    public eventService: EventService
  ) {}

  ngOnInit() {
    this.loadParcels();
  }

  ngAfterViewInit() {
    // Počakamo da je view inicializiran, potem šele subscribamo na event
    setTimeout(() => {
      console.log('ViewChild initialized:', !!this.scrollContainer);
      
      this.eventSubscription = this.eventService.eventActivated$.subscribe(event => {
        if (event.type === 'parcel-selected') {
          this.selectedParcelId = event.data.id;
          console.log('Parcel selected, ID:', this.selectedParcelId);

          // ChangeDetection + DOM update
          setTimeout(() => {
            this.scrollToSelectedParcel();
          }, 100);

        } else if (event.type === 'parcel-deselected') {
          this.selectedParcelId = null;
        }
      });
    }, 0);
  }

  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }

  // Označimo vrstice v tabeli
  isParcelSelected(parcelId: any): boolean {
    return String(this.selectedParcelId) === String(parcelId);
  }

  private scrollToSelectedParcel(): void {
    console.log('scrollToSelectedParcel called');
    console.log('scrollContainer exists:', !!this.scrollContainer);
    
    if (!this.scrollContainer) {
      console.error('scrollContainer is still undefined!');
      return;
    }

    const container = this.scrollContainer.nativeElement;
    console.log('Container element:', container);
    
    const selectedRow = container.querySelector('tr.selected') as HTMLElement | null;
    console.log('Selected row found:', !!selectedRow);

    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('✓ Scrolled to selected parcel:', this.selectedParcelId);
    } else {
      console.warn('Selected row not found in DOM');
    }
  }

  // Naložimo podatke
  loadParcels() {
    if (this.izbira === 'all') {
      this.parcelService.getAll().subscribe({
        next: (data: any[]) => {
          this.ParcelsArray = data;
          this.mapService.addAllParcelsGeoJsonToLayer(data);
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju parcel:', error);
          this.statusMessage.emit('Napaka pri pridobivanju parcel.');
        }
      });
    } else {
      this.parcelService.getOne(this.inputId).subscribe({
        next: (parcel: any) => {
          this.ParcelsArray = [parcel];
          this.mapService.addAllParcelsGeoJsonToLayer([parcel]);
        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju parcele:', error);
          this.statusMessage.emit(`Parcela z ID=${this.inputId} ne obstaja.`);
          this.ParcelsArray = [];
        }
      });
    }
  }

  setIzbira(value: 'all' | 'one') {
    this.izbira = value;
    this.loadParcels();
  }

  onInputIdChange(event: any) {
    this.inputId = Number(event.target.value);
    if (this.izbira === 'one') {
      this.loadParcels();
    }
  }

  setUpdate(parcel: any) {
    this.editParcel.emit(parcel);
  }

  setDelete(parcel: any) {
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to delete data.');
      return;
    }

    this.parcelService.delete(parcel.id).subscribe({
      next: () => {
        this.statusMessage.emit('Parcel deleted successfully');
        this.loadParcels();
      },
      error: (error) => {
        console.error('Napaka pri brisanju parcele:', error);
        this.statusMessage.emit('Napaka pri brisanju parcele.');
      }
    });
  }

  drawParcelGeometry(parcel: any) {
    console.log('[drawParcelGeometry] Parcel:', parcel);
    if (!parcel?.geom_geojson) {
      console.warn('[drawParcelGeometry] geom_geojson manjka!');
      return;
    }
    this.mapService.addParcelsGeoJsonToLayer(parcel.geom_geojson);
  }


  // iščemo parcelo po tabeli na podlagi vnosnih polj KO + PARC_ST
  isciParcelo() {
    if (!this.iskanjeKO.trim() || !this.iskanjeParc.trim()) {
      this.statusMessage.emit("Vnesi obe vrednosti: KO in Parc. št.!");
      alert('Vnesi obe vrednosti: KO in Parc. št.');
      return;
    }

    // poiščemo ustrezno parcelo (primer: property imenuješ sifko in parc_st)
    const najdena = this.ParcelsArray.find(p =>
      String(p.sifko).trim() === this.iskanjeKO.trim() &&
      String(p.parc_st).trim() === this.iskanjeParc.trim()
    );

    if (najdena) {
      this.selectedParcelId = najdena.id;
      setTimeout(() => this.scrollToSelectedParcel(), 100);
    } else {
      this.statusMessage.emit("Ni najdene parcele s podanima vrednostma!");
      alert('Ni najdene parcele s podanima vrednostma.');
    }
  }



}
