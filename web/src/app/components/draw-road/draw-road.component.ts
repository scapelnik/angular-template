import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MapService } from '../../services/map.service';

import {Draw} from 'ol/interaction';
import { DrawEvent } from 'ol/interaction/Draw';
import {WKT} from 'ol/format';
import VectorSource from 'ol/source/Vector';
import { Router } from '@angular/router';
import { EventService } from '../../services/event.service';
import { DrawModeService } from '../../services/draw-mode.service';
import { EventModel } from '../../models/event.model';
import { WktGeometryTransferService} from'../../services/wkt-geometry-transfer.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-draw-road',
  standalone: true,
  imports: [MatIconModule, MatTooltip],
  templateUrl: './draw-road.component.html',
  styleUrl: './draw-road.component.scss'
})
export class DrawRoadComponent implements AfterViewInit, OnDestroy, OnInit {
  drawMode: boolean = false;
  canDraw: boolean = false;
  drawRoad: Draw | undefined;
  selectMode: boolean = false;
  modeSubscription!: Subscription; 
  editMode = false;

  constructor(
    private wktTransfer: WktGeometryTransferService, 
    public mapService: MapService, 
    public router: Router, 
    public eventService: EventService,
    private drawModeService: DrawModeService
    ) {
    // Spremljaj spremembe načina risanja
    this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'road'); // omogoči risanje samo, če je način "parcel"
    });

    this.eventService.eventActivated$.subscribe((event: EventModel) => {
      console.log("[Draw-road] Event received in DrawRoadComponent:", event.type);
      if (event.type != 'drawRoadActivated') {
        this.drawMode = false; // Reset draw mode if a different event is received
      }
    });
  }

  ngOnInit(): void {
    this.modeSubscription = this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'road');

      // Če ni risanja na road, (če smo preklopili na parcele...) in je risanje aktivno, ga izklopi
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

  ngAfterViewInit(): void {
    console.log("[Draw-road] DrawRoadComponent initialized");
    this.addDrawRoadInteraction();
    this.disableDrawRoads();
    this.reloadRoadsWmsLayer();
  }

  toggleDrawMode(){
    this.drawMode = !this.drawMode;
    if(this.drawMode){
      // Start drawing mode
      this.enableDrawRoads();
      console.log("[Draw-road] Drawing mode activated");
    } else {
      // Stop drawing mode
      this.disableDrawRoads();
      // this.clearVectorLayer();
      this.reloadRoadsWmsLayer();
      this.editMode = false;
      this.selectMode = false;
      console.log("[Draw-road] Drawing mode deactivated");
    }
  }

    // ta funkcija posluša eventService od prfesorja 
    // ko pride event, preklopi v select mode
  selectRoad(): void {
    this.selectMode = !this.selectMode;   // preklopi v selectMode
    const mode = this.selectMode ? 'select-road' : 'road'; 
    this.eventService.emitEvent(new EventModel('modeChange', mode));    // delamo z event-service!!! 0.5 točke :) V map.service je funkcija
  }
  
  editRoad(): void {
    this.editMode = !this.editMode;
    console.log('[draw-roads] editRoad toggled. Novi mode:', this.editMode ? 'edit-road' : 'road');
    console.log('[draw-roads] editRoad: ', this.editMode);
    const mode = this.editMode ? 'edit-road' : 'road';
    this.eventService.emitEvent(new EventModel('modeChange', mode));
 
    if (!this.editMode) {   // kliknili smo gumb za konec urejanja, editMode=false
      // urejanje je končano, sproži zahtevo za WKT, ki bo postrežena v map.service najprej v eventhandlerju
      // Pred oddajo zahtevka za WKT, povemo mapService, da sme poslati WKT
      this.mapService.setShouldEmitWkt(true);
      console.log('[draw-road] Gumb "končaj urejanje" kliknjen.');

      this.mapService.sendRoadWkt();

      this.eventService.emitEvent(new EventModel('requestRoadWkt', null));
      console.log('[draw-road] Poslal event "requestRoadWkt"');
    }
  }

  addDrawRoadInteraction() {
    //Add the draw interaction when the component is initialized
    var sourceRoads: VectorSource = this.mapService.getLayerByTitle('Roads vector')?.getSource();
    if(sourceRoads){
      this.drawRoad = new Draw({
         source: sourceRoads, //source of the layer where the poligons will be drawn
        type: ('LineString') //geometry type
      });
      this.drawRoad.on('drawend', this.manageDrawEnd);
  
      //adds the interaction to the map. This must be done only once
      this.mapService.map!.addInteraction(this.drawRoad);
    }else{
      console.error("Error: Roads layer not found");
    }
  }

  //Enables the polygons draw
  enableDrawRoads(){
    this.mapService.disableMapInteractions(); // Ko kliknemo draw roads, se morajo ostali gumbi ugasnit glej map service!
    this.drawRoad!.setActive(true);
    this.eventService.emitEvent(new EventModel('drawRoadActivated', {}));
  }

  //Disables the polygons draw
  disableDrawRoads(){
    this.drawRoad!.setActive(false);
  }

  //Enables clear the vector layer
  clearVectorLayer(){
    this.mapService.getLayerByTitle('Roads vector')?.getSource().clear();
  }
  //Reload Roads WMS Layer
  reloadRoadsWmsLayer(){
    this.mapService.getLayerByTitle('Roads WMS')?.getSource().updateParams({"time": Date.now()})
  }

  /**
   * Function which is executed each time that a polygon is finished of draw
   * Inside the e object is the geometry drawed.
   * 
   * IMPORTANT
   * It is an arow fuction in order to 'this' refer to the component class
   * and to have access to the router
   * */
  manageDrawEnd = (e: DrawEvent) => {
    var feature = e.feature;//this is the feature that fired the event
    var wktFormat = new WKT();//an object to get the WKT format of the geometry
    var wktRepresentation  = wktFormat.writeGeometry(feature.getGeometry()!);//geomertry in wkt
    console.log("[Drav-road]",wktRepresentation);//logs a message
    this.wktTransfer.sendGeometry('road', wktRepresentation);
    // this.router.navigate(['/road-form'], { queryParams: {geom: wktRepresentation }});
  }

  ngOnDestroy(): void {
    // Remove the draw interaction when the component is destroyed
    if (this.drawRoad) {
      this.mapService.map?.removeInteraction(this.drawRoad);
      console.log("[Draw-road] Draw interaction removed");
    }
    if (this.modeSubscription) {
      this.modeSubscription.unsubscribe();
    }
  }
}