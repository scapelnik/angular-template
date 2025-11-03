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
  selector: 'app-draw-parcel',
  standalone: true,
  imports: [MatIconModule, MatTooltip],
  templateUrl: './draw-parcel.component.html',
  styleUrl: './draw-parcel.component.scss'
})
export class DrawParcelComponent implements AfterViewInit, OnDestroy, OnInit {
  drawMode: boolean = false;
  canDraw: boolean = false;
  drawParcel: Draw | undefined;
  selectMode: boolean = false;
  modeSubscription!: Subscription; 
  editMode = false;
  snapInteraction?: Snap;

  // v konstruktorju imamo na primer WktGeometryTransfer service  (servis je najavljen tudi pod import)
  // parcel-form posluša ta service, sam servis najdeš seveda med servisi...
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
      this.canDraw = (mode === 'parcel'); // omogoči risanje samo, če je način "parcel"
    });

    // Enotno spremljanje vseh EventService dogodkov
    this.eventService.eventActivated$.subscribe((event: EventModel) => {
      if (event.type === 'parcelsAddedToMap') {
        const sourceParcels = this.mapService.getLayerByTitle('Parcels vector')?.getSource();

        if (sourceParcels) {
          // Poslušaj, kdaj so feature-ji fizično dodani
          const handle = () => {
            console.log('[DrawParcel] Features now added. Initializing drawing interaction...');
            sourceParcels.un('addfeature', handle); // odstranimo listener, da se ne ponavlja
            // this.addDrawParcelInteraction(); // zdaj je snap varen
          };

          // Če so že dodani (preveri dolžino), lahko takoj aktiviraš
          if (sourceParcels.getFeatures().length > 0) {
            handle();
          } else {
            sourceParcels.on('addfeature', handle); // sicer čakamo na dodajanje
          }
        }
      }
    });
  }


  
  ngOnInit(): void {
    this.modeSubscription = this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'parcel');

      // Če ni več parcelni način in je risanje aktivno, ga izklopi
      if (mode !== 'parcel') {
        // Če zapustimo parcelni sloj, izklopi risanje in ponastavi vse režime
        if (this.drawMode) {
          this.toggleDrawMode(); // to že ustavi risanje
        }
        this.editMode = false;
        this.selectMode = false;
      }
    });
  }


  // ngAfterViewInit(): void {
  //   console.log("DrawParcelComponent initialized");
  //   this.addDrawParcelInteraction();
  //   this.disableDrawParcels();
  //   this.reloadParcelsWmsLayer();
  //   // Dodamo spremembo kurzorja za snapanje, ko smo dovolj blizu
  //   this.addSnapCursorFeedback();
  // }

  ngAfterViewInit(): void {
    console.log("DrawParcelComponent initialized");

    this.disableDrawParcels();              // poskrbi, da se ne riše
    this.mapService.clearDrawInteraction(); // počisti vsa stanja na začetku
    this.reloadParcelsWmsLayer();

    this.addSnapCursorFeedback(); // to je v redu za UX
  }

  // tu spreminjamo kurzor ob SNAP-anju
  addSnapCursorFeedback() {
    const map = this.mapService.map!;
    const source = this.mapService.getLayerByTitle('Parcels vector')?.getSource();
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
  //     this.enableDrawParcels();
  //     console.log("[Drav-parcel] Drawing mode activated");
  //   } else {
  //     // Stop drawing mode
  //     this.disableDrawParcels();
  //     // this.clearVectorLayer();
  //     this.reloadParcelsWmsLayer();
  //     this.editMode = false;
  //     this.selectMode = false;
  //     console.log("[Drav-parcel] Drawing mode deactivated");
  //   }
  // }

  toggleDrawMode() {
    this.drawMode = !this.drawMode;

    if (this.drawMode) {
      // Vključi risanje - aktiviraj interakcijo
      this.drawParcel?.setActive(true);
      this.addDrawParcelInteraction();
      this.snapInteraction?.setActive(true);
      console.log('[DrawParcel] Risanje vključeno');
    } else {
      // Izključi risanje - deaktiviraj interakcijo
      this.drawParcel?.setActive(false);
      this.snapInteraction?.setActive(false);
      this.reloadParcelsWmsLayer();
      this.editMode = false;
      this.selectMode = false;
      console.log('[DrawParcel] Risanje izključeno');
    }
  }
   
  // od tu se sproži selektiranje parcdel s pomočjo proferorjevega event-service  )
  selectParcel(): void {
    this.selectMode = !this.selectMode;   // preklopi v selectMode
    console.log('[draw-parcel] selectParcel: ',this.editMode);
    const mode = this.selectMode ? 'select-parcel' : 'parcel'; 
    this.eventService.emitEvent(new EventModel('modeChange', mode));
  }

  // EDIT PARCEL BREZ SNAP-anja
  // od tu se sproži editiranje parcdel s pomočjo proferorjevega event-service  )
  editParcel(): void {
    this.editMode = !this.editMode;
    console.log('[draw-parcel] editParcel: ', this.editMode);
    const mode = this.editMode ? 'edit-parcel' : 'parcel';
    this.eventService.emitEvent(new EventModel('modeChange', mode));

    if (!this.editMode) {   // kliknili smo gumb za konec urejanja, editMode=false
      this.mapService.setShouldEmitParcelWkt(true);
      console.log('[draw-parcel] Gumb "končaj urejanje" kliknjen.');

      this.mapService.sendParcelWkt();

      this.eventService.emitEvent(new EventModel('requestParcelWkt', null));
      console.log('[draw-parcel] Poslal event "requestParcelWkt"');
    }
  }

  // EDIT PARCEL Z SNAP-om
  // editParcel(): void {
  //   this.editMode = !this.editMode;
  //   const mode = this.editMode ? 'edit-parcel' : 'parcel';
  //   this.eventService.emitEvent(new EventModel('modeChange', mode));

  //   if (this.editMode) {
  //     console.log('[draw-parcel] Začenjam urejanje parcele.');
  //     this.mapService.addModifyParcelInteraction();
  //   } else {
  //     console.log('[draw-parcel] Zaključujem urejanje parcele.');
  //     this.mapService.removeModifyParcelInteraction();

  //     this.mapService.setShouldEmitParcelWkt(true);
  //     this.mapService.sendParcelWkt();
  //     this.eventService.emitEvent(new EventModel('requestParcelWkt', null));
  //   }
  // }
  


  // Tu se dejansko rišejo parcele na karto.
  addDrawParcelInteraction() {
    const map = this.mapService.map!;
    const sourceParcels = this.mapService.getLayerByTitle('Parcels vector')?.getSource();

    if (sourceParcels) {
      console.log('[addDrawParcelInteraction] Kličem funkcijo. Število feature-jev v source:', sourceParcels.getFeatures().length);

      // Odstrani stare interakcije
      if (this.drawParcel) {
        map.removeInteraction(this.drawParcel);
        console.log('[addDrawParcelInteraction] Odstranjena prejšnja Draw interakcija');
      }
      if (this.snapInteraction) {
        map.removeInteraction(this.snapInteraction);
        console.log('[addDrawParcelInteraction] Odstranjena prejšnja Snap interakcija');
      }

      // Ustvari Draw interakcijo
      this.drawParcel = new Draw({
        source: sourceParcels,
        type: 'Polygon'
      });
      this.drawParcel.on('drawend', this.manageDrawEnd);
      map.addInteraction(this.drawParcel);
      console.log('[addDrawParcelInteraction] Dodana nova Draw interakcija');

      // Ustvari Snap interakcijo
      this.snapInteraction = new Snap({ source: sourceParcels });
      map.addInteraction(this.snapInteraction);
      console.log('[addDrawParcelInteraction] Dodana Snap interakcija');

    } else {
      console.error('[addDrawParcelInteraction] Napaka: Parcelni layer ni najden!');
    }
  }


  
  //Enables the polygons draw
  enableDrawParcels(){
    this.mapService.disableMapInteractions(); // Disable other interactions
    this.drawParcel!.setActive(true);
    this.eventService.emitEvent(new EventModel('drawParcelActivated', {}));
  }

  //Disables the polygons draw
  disableDrawParcels() {
    if (this.drawParcel) {
      this.drawParcel.setActive(false);
    }

    if (this.snapInteraction) {
      this.mapService.map?.removeInteraction(this.snapInteraction);
      this.snapInteraction = undefined!;
    }
  }

  //Enables clear the vector layer
  clearVectorLayer(){
    this.mapService.getLayerByTitle('Parcels vector')?.getSource().clear();
  }

  //Reload Parcels WMS Layer
  reloadParcelsWmsLayer(){
    this.mapService.getLayerByTitle('Parcels WMS')?.getSource().updateParams({"time": Date.now()})
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
    console.log("[Drav-parcel]",wktRepresentation);//logs a message
    // Pošlji geometrijo preko servisa
    this.wktTransfer.sendGeometry('parcel', wktRepresentation);
    // this.router.navigate(['/form-parcel'], { queryParams: {geom: wktRepresentation }});
  }

  ngOnDestroy(): void {
    // Remove the draw interaction when the component is destroyed
    if (this.drawParcel) {
      this.mapService.map?.removeInteraction(this.drawParcel);
      console.log("[Drav-parcel] Draw interaction removed");
    }
    if (this.modeSubscription) {
      this.modeSubscription.unsubscribe();
    }
    if (this.snapInteraction) {
      this.mapService.map?.removeInteraction(this.snapInteraction);
}
  }


}