import { Component, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MenuComponent } from './components/menu/menu.component';
import { ParcelFormComponent } from './components/forms/parcel-form/parcel-form.component';
import { ParcelTableComponent } from './components/tables/parcel-table/parcel-table.component';
import { BuildingFormComponent } from './components/forms/building-form/building-form.component';
import { BuildingTableComponent } from './components/tables/building-table/building-table.component';
import { RoadFormComponent } from './components/forms/road-form/road-form.component';
import { RoadTableComponent } from './components/tables/road-table/road-table.component';
import { AddressTableComponent } from './components/tables/address-table/address-table.component';
import { AddressFormComponent } from './components/forms/address-form/address-form.component';
import { MapComponent } from './components/map/map.component';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LoginFormComponent } from './components/forms/login-form/login-form.component';
import { MapService } from './services/map.service';
import { GeoService } from './services/geo.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    MenuComponent,
    ParcelFormComponent,
    ParcelTableComponent,
    BuildingFormComponent,
    BuildingTableComponent,
    RoadFormComponent,
    RoadTableComponent,
    AddressTableComponent,
    AddressFormComponent,
    MapComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild(ParcelTableComponent) parcelTable!: ParcelTableComponent;
  @ViewChild(ParcelFormComponent) parcelForm!: ParcelFormComponent;
  @ViewChild(BuildingTableComponent) buildingTable!: BuildingTableComponent;
  @ViewChild(BuildingFormComponent) buildingForm!: BuildingFormComponent;  
  @ViewChild(RoadTableComponent) roadTable!: RoadTableComponent;
  @ViewChild(RoadFormComponent) roadForm!: RoadFormComponent;
  @ViewChild(AddressTableComponent) addressTable!: AddressTableComponent;
  @ViewChild(AddressFormComponent) addressForm!: AddressFormComponent;
  title = 'web';
  leftWidth = 40; // začetna širina v %
  topHeight = 60; // začetna višina karte v %
  private isResizingX = false;
  private isResizingY = false;


  constructor(
    public authService: AuthService, 
    private router: Router,
    private dialog: MatDialog,
    private mapService: MapService,   // <-- dodano za klic funkcij iz map.service 
    private geoService: GeoService   // tukaj dodamo GeoService za izvoz Geopackage
   ) {}
  statusText = '';


  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    console.log('[App.Component.ts], Key Pressed? ', event.key, 'alt:', event.altKey, 'shift:', event.shiftKey);

    if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      console.log('[App.Component.ts]] Alt + Shift + e detected!');
      this.downloadGpkg();
    }
  }  


  @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
      if (this.isResizingX) {
        const containerWidth = window.innerWidth;
        const newWidth = (event.clientX / containerWidth) * 100;
        if (newWidth > 10 && newWidth < 90) this.leftWidth = newWidth;
      }

      if (this.isResizingY) {
        const containerHeight = window.innerHeight;
        const newHeight = (event.clientY / containerHeight) * 100;
        if (newHeight > 10 && newHeight < 90) this.topHeight = newHeight;
      }
  }


  @HostListener('document:mouseup')
    stopResize() {
      this.isResizingX = false;
      this.isResizingY = false;
    }


  startResizeX(event: MouseEvent) {   // začni spreminjati velikost panelov levo in desno
    this.isResizingX = true;
    event.preventDefault();
  }

    // --- vertikalno (gor-dol)
  startResizeY(event: MouseEvent) {   // začni spreminjati velikost panelov gor in dol
    this.isResizingY = true;
    event.preventDefault();
  }
  

  downloadGpkg() {
      this.geoService.downloadGeoPackage().subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'podatki.gpkg';
          a.click();
          window.URL.revokeObjectURL(url);
          this.statusText = "Zbirka je med prenosi!"; //  direktno BREZ EMITORJA ker smo že v parent komponenti
        },
        error: (err) => {
          console.error('Napaka pri prenosu GeoPackage:', err);
          this.statusText = "Napaka pri prenosu zbirke!";
        }
      });
    }


  updateStatus(message: string) {
    this.statusText = message;
  }

  selectedType: 'parcel' | 'building' | 'road' | 'address' = 'parcel';         // to nam pove na katerem jezičku MENUJA smo




  // Če hočemo prijavo na začetku odkomentiramo, sicer lahko delamo tudi brez prijave
  ngOnInit(): void {
    // this.authService.initCsrfToken();                        // za csrf token                 
    this.authService.statusMessage$.subscribe(message => {      // Za sporočila iz authService  (kdo je prijavljen s kakšnimi pravicami)
      this.statusText = message;
    });
    //  TO SPODAJ ODKOMENTIRAMO, če želimo prijavo takoj na začetku
    // this.authService.checkIsLoggedInInServer().subscribe(() => {
    //   if (!this.authService.isAuthenticated) {
    //     this.dialog.open(LoginFormComponent, {
    //       disableClose: true
    //     });
    //   } else {
    //     console.log('[AppComponent] Uporabnik je že prijavljen:', this.authService.username);
    //   }
    // });
    this.authService.statusMessage$.subscribe(message => {
        this.statusText = message;
    });

    // Ob vsakem zagonu preverimo, ali je prijavljen uporabnik (prek Django seje)
    this.authService.checkIsLoggedInInServer().subscribe();
  }


  openLoginDialog(): void {
    this.dialog.open(LoginFormComponent, {
      disableClose: true, // Ne dovoli zapreti brez prijave
    });
  }



  switchForm(module: 'parcel' | 'building' | 'road' | 'address') {                     // v module je izbira !
    console.log('Preklapljam:', module); // Dodaj to vrstico za debug      // izbilo izpišem na conolo
    this.selectedType = module;
  }

  refreshTable() {
    if (this.selectedType === 'parcel') {
      this.parcelTable?.loadParcels();
    }
    if (this.selectedType === 'building') {
      this.buildingTable?.loadBuildings();
    }
    if (this.selectedType === 'road') {
      this.roadTable?.loadRoads();
    }
    if (this.selectedType === 'address') {
      this.addressTable?.loadAddresses();
    }
  }

  handleEditParcel(parcel: any) {
    console.log('Parcel selected for edit:', parcel);
    this.selectedType = 'parcel';  // prikazujemo obrazec za urejanje parcele
    this.parcelForm.setUpdate(parcel);  // nastavimo podatke v obrazcu

     // pokliči funkcijo za označevanje na karti
    this.mapService.highlightParcelOnMap(parcel);
  }

  handleEditBuilding(building: any) {
    console.log('Building selected for edit:', building);
    this.selectedType = 'building';  // prikazujemo obrazec za urejanje stavbe
    this.buildingForm.setUpdate(building);  // nastavimo podatke v obrazcu

     // pokliči funkcijo za označevanje na karti
    this.mapService.highlightBuildingOnMap(building);    
  }  

  handleEditRoad(road: any) {
    console.log('Road selected for edit:', road);
    this.selectedType = 'road';  // prikazujemo obrazec za urejanje ceste (road)
    this.roadForm.setUpdate(road);  // nastavimo podatke v obrazcu

    // pokliči funkcijo za označevanje na karti
    this.mapService.highlightRoadOnMap(road); 
  }

  handleEditAddress(address: any) {
    console.log('Address selected for edit:', address);
    this.selectedType = 'address';  // prikazujemo obrazec za urejanje naslovov (address)
    this.addressForm.setUpdate(address);  // nastavimo podatke v obrazcu

    // pokliči funkcijo za označevanje na karti
    this.mapService.highlightAddressOnMap(address); 
  }
}