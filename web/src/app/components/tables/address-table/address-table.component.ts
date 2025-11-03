import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddressService } from '../../../services/address.service';
import { MapService } from '../../../services/map.service'; 
import { AuthService } from '../../../services/auth.service';  // bomo preverjali če smo prijavljeni!
import { MatDialog } from '@angular/material/dialog';
import { EventService } from '../../../services/event.service';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-address-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './address-table.component.html',
  styleUrl: './address-table.component.scss'
})
export class AddressTableComponent implements OnInit, AfterViewInit, OnDestroy {
   @Output() statusMessage = new EventEmitter<string>();    // za sporočila za statusno vrstico
   @Output() editAddress = new EventEmitter<any>();  // se sproži ob kliku na gumb "Uredi" v tabeli, pošlje address objekt v formo
   @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef<HTMLDivElement>;

   AddressArray: any[] = [];
   izbira: 'all' | 'one' = 'all';  // spremenljivka za izbiro med vsemi naslovi ali enim naslovom
   inputId: number =1;  // spremenljivka za shranjevanje izbranega naslova, na začetku je 2
   selectedAddressId: number | null = null; 
   private eventSubscription?: Subscription;
   filterImeUlice: string = '';
   filtriranArray: any[] = [];

  constructor(
    private addressService: AddressService,
    private mapService: MapService,
    private authService: AuthService,
    private dialog: MatDialog,
    public eventService: EventService
  ) {}

  ngOnInit() {
    this.loadAddresses();
  }

  ngAfterViewInit() {
    // Počakamo da je view inicializiran, potem šele subscribamo na event
    setTimeout(() => {
      console.log('[Address table], ViewChild initialized:', !!this.scrollContainer);
      
      this.eventSubscription = this.eventService.eventActivated$.subscribe(event => {
        if (event.type === 'address-selected') {
          this.selectedAddressId = event.data.id;
          console.log('[Address table], Address selected, ID:', this.selectedAddressId);

          // ChangeDetection + DOM update
          setTimeout(() => {
            this.scrollToSelectedAddress();
          }, 100);

        } else if (event.type === 'address-deselected') {
          this.selectedAddressId = null;
        }
      });
    }, 0);
  }

  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }

  // Označimo vrstice v tabeli
  isAddressSelected(addressId: any): boolean {
    return String(this.selectedAddressId) === String(addressId);
  }

  private scrollToSelectedAddress(): void {
    console.log('[Address table], scrollToSelectedAddress called');
    console.log('[Address table], scrollContainer exists:', !!this.scrollContainer);
    
    if (!this.scrollContainer) {
      console.error('[Address table], scrollContainer je še vedno nedefiniran!');
      return;
    }

    const container = this.scrollContainer.nativeElement;
    console.log('[Address table], Container element:', container);
    
    const selectedRow = container.querySelector('tr.selected') as HTMLElement | null;
    console.log('[Address table], Selected row found:', !!selectedRow);

    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      console.log('[Address table], ✓ Scrolled to selected address:', this.selectedAddressId);
    } else {
      console.warn('[Address table], Selected row not found in DOM');
    }
  }



  loadAddresses() {
    if (this.izbira === 'all') {
      this.addressService.getAll().subscribe({    // getAll je metoda v address.service.ts
        next: (data: any[]) => {
          console.log('Prejeti naslovi:', data);  
          this.AddressArray = data;

          this.mapService.addAddressesGeoJsonToLayer(data);
          this.applyFilter();  // Aplicira filter (ali pokaže vse če je filter prazen)         // Dodano za FILTER 

        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju naslova:', error);
          this.statusMessage.emit('Napaka pri pridobivanju naslova.');
        }
      });
    } else {
      this.addressService.getOne(this.inputId).subscribe({       // getOne je metoda v address.service.ts
        next: (address: any) => {
          this.AddressArray = [address];  // samo en naslov v tabeli
          this.filtriranArray = [address];                                                     // Dodano za FILTER
          this.mapService.addAddressesGeoJsonToLayer(address);

        },
        error: (error: any) => {
          console.error('Napaka pri pridobivanju naslovov:', error);
          this.statusMessage.emit(`Address z ID=${this.inputId} do not Exists.`);
          this.AddressArray = [];  // počisti tabelo
          this.filtriranArray = [];                                                             // Dodano za FILTER
        }
      });
    }
  }




  setIzbira(value: 'all' | 'one') {
    this.izbira = value;
    this.loadAddresses();
  }

  onInputIdChange(event: any) {
    this.inputId = Number(event.target.value);
    if (this.izbira === 'one') {
      this.loadAddresses();
    }
  }

  setUpdate(address: any) {      // ob kliku na gumb "Uredi" v tabeli se sproži ta metoda in pošlje address objekt v formo
    console.log('AddressTableComponent: setUpdate', address);  // za testiranje
    this.editAddress.emit(address);
  }

  setDelete(address: any) {                            // ob kliku na gumb "Izbriši" v tabeli se sproži ta metoda in izbriše address objekt

    // preverimo ali imamo pravice za brisanje naslovov, torej ali smo v grupi editors ali admins
    if (!this.authService.ensureCanEdit()) {
      this.statusMessage.emit('You do not have permission to delete data.');
    return;
    }

    this.addressService.delete(address.id).subscribe({
      next: () => {
        // Namesto alerta, ki odpre novo okno,  pošljemo raje sporočilo v statusno vrstico
        this.statusMessage.emit('Address deleted successfully');
        this.loadAddresses();
      },
      error: (error) => {
        //console.error('Napaka pri brisanju ceste.', error);      // samo za testiranje
        this.statusMessage.emit('Error deleting address:');           // sporočilo za statusno vrstico
      }
    });
  }


  drawAddressGeometry(address: any) {
    console.log('[drawAddressGeometry] Address:', address);
    if (!address?.geom_geojson) {
      console.warn('[drawAddressGeometry] geom_geojson manjka!');
      return;
    }
    this.mapService.addOneAddressGeoJsonToLayer(address.geom_geojson);
  }


  // Metoda za filtriranje
  applyFilter() {
    if (!this.filterImeUlice || this.filterImeUlice.trim() === '') {
      // Če je filter prazen, prikaži vse
      this.filtriranArray = this.AddressArray;
    } else {
      // Filtriraj po imenu ulice (case-insensitive)
      this.filtriranArray = this.AddressArray.filter(address => 
        address.street?.toLowerCase().includes(this.filterImeUlice.toLowerCase())
      );
    }
    
    // Posodobi karto z filtriranimi cestami
    this.mapService.addAddressesGeoJsonToLayer(this.filtriranArray);
    
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