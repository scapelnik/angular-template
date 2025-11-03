import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ElementRef} from '@angular/core';

//My imports
import { MapService } from '../../services/map.service';
import { DrawParcelComponent } from '../draw-parcel/draw-parcel.component';
import { DrawRoadComponent } from '../draw-road/draw-road.component';
import { DrawAddressComponent } from '../draw-address/draw-address.component';
import { DrawBuildingComponent } from '../draw-building/draw-building.component';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [DrawParcelComponent, DrawRoadComponent, DrawAddressComponent, DrawBuildingComponent],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy{
  //Referemce to the map div
  //It is available in this.mapContainer.nativeElement
  //! is a non-null assertion operator. Means that the variable is not null or undefined
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;


  //Usually only to inject services
  constructor(public mapService: MapService) {}
  

  //Called when the component is created
  //It is called before the template objects are created
  //but after the constructor
  ngOnInit(): void {
  }


  //After the template objects are created.
  //This method is called after ngOnInit
  //It is necessary to give time to build the component, so
  // the div with the id map is created
  //and the map can be created
  ngAfterViewInit(): void {
    console.log('[Map] mapComponent initialized');
    this.mapService.map.setTarget(this.mapContainer.nativeElement);
    console.log('[Map] Karta, ponovno povezana z novim DOM-om');   // DOM = Document Object Model

    // Počakamo na target, potem dodamo kontrolnik!
  
    setTimeout(() => {
       this.mapService.map.updateSize();
       this.mapService.addLayerSwitcherControl();
    }, 500); 
  }


  ngOnDestroy(): void {
    if (this.mapService.map) {
      // Ko se komponenta uniči je ključno
      // da se odstrani zemljevid iz DOM-a
      // Če tega ne narediš, ga lahko OpenLayers poskusi uporabiti
      // v neobstoječem elemntu
      // kar lahko povzroči napake v programu, ali izgubo spomina (pomnilnika) (dokler ga ne resetiramo)
      this.mapService.map.setTarget(undefined);

      console.log('[Map] Karta se odklopi od DOM-a pred uničenjem komponente');
    }
  }
}