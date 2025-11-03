import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MapService } from '../../services/map.service';

import { Draw } from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import { WKT } from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { Router } from '@angular/router';

import { DrawModeService } from '../../services/draw-mode.service';
import { WktGeometryTransferService} from'../../services/wkt-geometry-transfer.service';

import { EventService } from '../../services/event.service';
import { EventModel } from '../../models/event.model';
import { Subscription } from 'rxjs';
import Snap from 'ol/interaction/Snap';

import { getDistance } from 'ol/sphere';
import Geometry from 'ol/geom/Geometry';
import Point from 'ol/geom/Point';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import Modify from 'ol/interaction/Modify';


@Component({
  selector: 'app-draw-building',
  standalone: true,
  imports: [MatIconModule, MatTooltip],
  templateUrl: './draw-building.component.html',
  styleUrl: './draw-building.component.scss'
})
export class DrawBuildingComponent implements AfterViewInit, OnDestroy, OnInit {
  drawMode: boolean = false;
  canDraw: boolean = false;
  drawBuilding: Draw | undefined;
  selectMode: boolean = false;
  modeSubscription!: Subscription; 
  editMode = false;
  snapInteraction?: Snap;

  // v konstruktorju imamo na primer WktGeometryTransfer service  (servis je najavljen tudi pod import)
  // building-form posluša ta service, sam servis najdeš seveda med servisi...
  // dejansko risanje pa se izvede na mapi
  constructor(
    private wktTransfer: WktGeometryTransferService,
    public mapService: MapService,
    public router: Router,
    public eventService: EventService,
    private drawModeService: DrawModeService
  ) {
    // Spremljaj spremembe načina risanja
    this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'building'); // omogoči risanje samo, če je način "building"
    });

    // Enotno spremljanje vseh EventService dogodkov
    this.eventService.eventActivated$.subscribe((event: EventModel) => {
      if (event.type === 'buildingsAddedToMap') {
        const sourceBuildings = this.mapService.getLayerByTitle('Buildings vector')?.getSource();

        if (sourceBuildings) {
          // Poslušaj, kdaj so feature-ji fizično dodani
          const handle = () => {
            console.log('[DrawBuilding] Features now added. Initializing drawing interaction...');
            sourceBuildings.un('addfeature', handle); // odstranimo listener, da se ne ponavlja
            // this.addDrawBuildingInteraction(); // zdaj je snap varen
          };

          // Če so že dodani (preveri dolžino), lahko takoj aktiviraš
          if (sourceBuildings.getFeatures().length > 0) {
            handle();
          } else {
            sourceBuildings.on('addfeature', handle); // sicer čakamo na dodajanje
          }
        }
      }
    });
  }


  
  ngOnInit(): void {
    this.modeSubscription = this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'building');

      // Če ni več stavbni način in je risanje aktivno, ga izklopi
      if (mode !== 'building') {
        // Če zapustimo stavbni sloj, izklopi risanje in ponastavi vse režime
        if (this.drawMode) {
          this.toggleDrawMode(); // to že ustavi risanje
        }
        this.editMode = false;
        this.selectMode = false;
      }
    });
  }


  // ngAfterViewInit(): void {
  //   console.log("DrawBuildingComponent initialized");
  //   this.addDrawBuildingInteraction();
  //   this.disableDrawBuildings();
  //   this.reloadBuildingsWmsLayer();
  //   // Dodamo spremembo kurzorja za snapanje, ko smo dovolj blizu
  //   this.addSnapCursorFeedback();
  // }

  ngAfterViewInit(): void {
    console.log("DrawBuildingComponent initialized");

    this.disableDrawBuildings();              // poskrbi, da se ne riše
    this.mapService.clearDrawInteraction(); // počisti vsa stanja na začetku
    this.reloadBuildingsWmsLayer();

    this.addSnapCursorFeedback(); // to je v redu za UX
  }

  // tu spreminjamo kurzor ob SNAP-anju
  addSnapCursorFeedback() {
    const map = this.mapService.map!;
    const source = this.mapService.getLayerByTitle('Buildings vector')?.getSource();
    if (!map || !source) return;

    map.on('pointermove', (event) => {
      const coordinate = event.coordinate;
      const features = source.getFeatures();
      const thresholdMeters = 5; // občutljivost (približek oglišču)

      let nearVertex = false;

      features.forEach((f: Feature) => {
        const geom = f.getGeometry();
        if (!geom) return;

        if (geom instanceof Polygon) {
          const coords = geom.getCoordinates(); // [ [ [x,y], [x,y], ... ] ]
          const ring = coords[0];

          for (const vertex of ring) {
            const dx = coordinate[0] - vertex[0];
            const dy = coordinate[1] - vertex[1];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < thresholdMeters) {
              nearVertex = true;
              break;
            }
          }
        }
      });

      const targetEl = map.getTargetElement() as HTMLElement;
      targetEl.style.cursor = nearVertex ? 'pointer' : 'crosshair';
    });
  }





  // toggleDrawMode(){
  //   this.drawMode = !this.drawMode;
  //   if(this.drawMode){
  //     // Start drawing mode
  //     this.enableDrawBuildings();
  //     console.log("[Drav-building] Drawing mode activated");
  //   } else {
  //     // Stop drawing mode
  //     this.disableDrawBuildings();
  //     // this.clearVectorLayer();
  //     this.reloadBuildingsWmsLayer();
  //     this.editMode = false;
  //     this.selectMode = false;
  //     console.log("[Drav-building] Drawing mode deactivated");
  //   }
  // }

  toggleDrawMode() {
    this.drawMode = !this.drawMode;

    if (this.drawMode) {
      // Vključi risanje - aktiviraj interakcijo
      this.drawBuilding?.setActive(true);
      this.addDrawBuildingInteraction();
      this.snapInteraction?.setActive(true);
      console.log('[DrawBuilding] Risanje vključeno');
    } else {
      // Izključi risanje - deaktiviraj interakcijo
      this.drawBuilding?.setActive(false);
      this.snapInteraction?.setActive(false);
      this.reloadBuildingsWmsLayer();
      this.editMode = false;
      this.selectMode = false;
      console.log('[DrawBuilding] Risanje izključeno');
    }
  }
   
  // od tu se sproži selektiranje parcdel s pomočjo proferorjevega event-service  )
  selectBuilding(): void {
    this.selectMode = !this.selectMode;   // preklopi v selectMode
    console.log('[draw-building] selectBuilding: ',this.editMode);
    const mode = this.selectMode ? 'select-building' : 'building'; 
    this.eventService.emitEvent(new EventModel('modeChange', mode));
  }

  // EDIT STAVBE BREZ SNAP-anja
  // od tu se sproži editiranje parcdel s pomočjo proferorjevega event-service  )
  editBuilding(): void {
    this.editMode = !this.editMode;
    console.log('[draw-building] editBuilding: ', this.editMode);
    const mode = this.editMode ? 'edit-building' : 'building';
    this.eventService.emitEvent(new EventModel('modeChange', mode));

    if (!this.editMode) {   // kliknili smo gumb za konec urejanja, editMode=false
      this.mapService.setShouldEmitBuildingWkt(true);
      console.log('[draw-building] Gumb "končaj urejanje" je bil aktiviran.');

      this.mapService.sendBuildingWkt();

      this.eventService.emitEvent(new EventModel('requestBuildingWkt', null));
      console.log('[draw-building] Poslal event "requestBuildingWkt"');
    }
  }

  // EDIT STAVB Z SNAP-om
  // editBuilding(): void {
  //   this.editMode = !this.editMode;
  //   const mode = this.editMode ? 'edit-building' : 'building';
  //   this.eventService.emitEvent(new EventModel('modeChange', mode));

  //   if (this.editMode) {
  //     console.log('[draw-building] Začenjam urejanje stavbe.');
  //     this.mapService.addModifyBuildingInteraction();
  //   } else {
  //     console.log('[draw-building] Zaključujem urejanje stavbe.');
  //     this.mapService.removeModifyBuildingInteraction();

  //     this.mapService.setShouldEmitBuildingWkt(true);
  //     this.mapService.sendBuildingWkt();
  //     this.eventService.emitEvent(new EventModel('requestBuildingWkt', null));
  //   }
  // }
  


  // Tu se dejansko rišejo stavbe na karto.
  addDrawBuildingInteraction() {
    const map = this.mapService.map!;
    const sourceBuildings = this.mapService.getLayerByTitle('Buildings vector')?.getSource();

    if (sourceBuildings) {
      console.log('[addDrawBuildingInteraction] Kličem funkcijo. Število feature-jev v source:', sourceBuildings.getFeatures().length);

      // Odstrani stare interakcije
      if (this.drawBuilding) {
        map.removeInteraction(this.drawBuilding);
        console.log('[addDrawBuildingInteraction] Odstranjena prejšnja Draw interakcija');
      }
      if (this.snapInteraction) {
        map.removeInteraction(this.snapInteraction);
        console.log('[addDrawBuildingInteraction] Odstranjena prejšnja Snap interakcija');
      }

      // Ustvari Draw interakcijo
      this.drawBuilding = new Draw({
        source: sourceBuildings,
        type: 'Polygon'
      });
      this.drawBuilding.on('drawend', this.manageDrawEnd);
      map.addInteraction(this.drawBuilding);
      console.log('[addDrawBuildingInteraction] Dodana nova Draw interakcija');

      // Ustvari Snap interakcijo
      this.snapInteraction = new Snap({ source: sourceBuildings });
      map.addInteraction(this.snapInteraction);
      console.log('[addDrawBuildingInteraction] Dodana Snap interakcija');

    } else {
      console.error('[addDrawBuildingInteraction] Napaka: Stavbni layer ni najden!');
    }
  }


  
  //Enables the polygons draw
  enableDrawBuildings(){
    this.mapService.disableMapInteractions(); // Disable other interactions
    this.drawBuilding!.setActive(true);
    this.eventService.emitEvent(new EventModel('drawBuildingActivated', {}));
  }

  //Disables the polygons draw
  disableDrawBuildings() {
    if (this.drawBuilding) {
      this.drawBuilding.setActive(false);
    }

    if (this.snapInteraction) {
      this.mapService.map?.removeInteraction(this.snapInteraction);
      this.snapInteraction = undefined!;
    }
  }

  //Enables clear the vector layer
  clearVectorLayer(){
    this.mapService.getLayerByTitle('Buildings vector')?.getSource().clear();
  }

  //Reload Buildings WMS Layer
  reloadBuildingsWmsLayer(){
    this.mapService.getLayerByTitle('Buildings WMS')?.getSource().updateParams({"time": Date.now()})
  }

  /**
   * Function which is executed each time that a polygon is finished of draw
   * Inside the e object is the geometry drawed.
   * 
   * IMPORTANT
   * It is an arow fuction in order to 'this' refer to the component class
   * and to have access to the router
   * */
  manageDrawEnd = (e: DrawEvent) => {     // KO NEHAŠ RISAT PO KARTI, KAJ SE ZGODI POTEM POVEŠ TU !!!
    var feature = e.feature;//this is the feature that fired the event
    var wktFormat = new WKT();//an object to get the WKT format of the geometry
    var wktRepresentation  = wktFormat.writeGeometry(feature.getGeometry()!);//geomertry in wkt
    console.log("[Drav-building]",wktRepresentation);//logs a message
    // Pošlji geometrijo preko servisa
    this.wktTransfer.sendGeometry('building', wktRepresentation);
    // this.router.navigate(['/form-building'], { queryParams: {geom: wktRepresentation }});
  }

  ngOnDestroy(): void {
    // Remove the draw interaction when the component is destroyed
    if (this.drawBuilding) {
      this.mapService.map?.removeInteraction(this.drawBuilding);
      console.log("[Drav-building] Draw interaction removed");
    }
    if (this.modeSubscription) {
      this.modeSubscription.unsubscribe();
    }
    if (this.snapInteraction) {
      this.mapService.map?.removeInteraction(this.snapInteraction);
}
  }


}