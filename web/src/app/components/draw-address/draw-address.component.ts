import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MapService } from '../../services/map.service';
import { DrawEvent } from 'ol/interaction/Draw';
import { Draw } from 'ol/interaction';
import { EventService } from '../../services/event.service';
import { DrawModeService } from '../../services/draw-mode.service';
import VectorSource from 'ol/source/Vector';
import { WKT } from 'ol/format';
import { Router } from '@angular/router';
import { EventModel } from '../../models/event.model';
import { MatTooltip } from '@angular/material/tooltip';   // če hočeš da dela Tooltip ko se z miško postaviš na gumb na karti...
import { WktGeometryTransferService} from'../../services/wkt-geometry-transfer.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-draw-address',
  standalone: true,
  imports: [MatIconModule, MatTooltip],
  templateUrl: './draw-address.component.html',
  styleUrl: './draw-address.component.scss'
})
export class DrawAddressComponent implements AfterViewInit, OnDestroy, OnInit {
  drawMode: boolean = false;
  canDraw: boolean = false;
  drawAddress: Draw | undefined;
  selectMode: boolean = false;
  modeSubscription!: Subscription; 
  editMode = false;

  constructor(
    private wktTransfer: WktGeometryTransferService, 
    public mapService:MapService, 
    public router: Router, 
    public eventService:EventService,
    private drawModeService: DrawModeService
    ) {
    // Spremljaj spremembe načina risanja
    this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'address'); // omogoči risanje samo, če je način "parcel"
    });

    // Dogodki iz EventService 
    this.eventService.eventActivated$.subscribe((event:EventModel) => {
      console.log("[Draw-Address] Event received in DrawAddressComponent:", event.type);
      if (event.type != 'drawAddressActivated') {
        this.drawMode = false; // Reset draw mode if a different event is received
      }
    });
  }

  ngOnInit(): void {
    this.modeSubscription = this.drawModeService.currentMode$.subscribe((mode) => {
      this.canDraw = (mode === 'address');

      // Če ni več address način in je risanje aktivno, ga izklopi
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
    console.log("[Draw-Address] DrawAddressComponent initialized");
    this.addDrawAddressInteraction();
    this.disableDrawAddress();
    this.reloadAddressWmsLayer();
  }
  
  toggleDrawMode() {
    this.drawMode = !this.drawMode;
    if (this.drawMode) {
      this.enableDrawAddress();  // Start drawing mode
      console.log("[Draw-Address] Drawing mode activated");
    }
    else {
      this.disableDrawAddress();  // Stop drawing mode
      // this.clearVectorLayer();
      this.reloadAddressWmsLayer();
      this.editMode = false;
      this.selectMode = false;
      console.log("[Draw-Address] Drawing mode deactivated");
      }
  }

  // ta funkcija posluša eventService od prfesorja 
  // ko pride event, preklopi v select mode
  selectAddress(): void {
    this.selectMode = !this.selectMode;   // preklopi v selectMode prej je bil false, zdaj je true  (selectMode definiran v vrstici 26)
    const mode = this.selectMode ? 'select-address' : 'address'; 
    this.eventService.emitEvent(new EventModel('modeChange', mode));    // delamo z event-service!!! 0.5 točke :) V map.service je funkcija
  }   
  
  editAddress(): void {
    this.editMode = !this.editMode;
    console.log('[draw-address] editAddress: ', this.editMode);
    const mode = this.editMode ? 'edit-address' : 'address';
    this.eventService.emitEvent(new EventModel('modeChange', mode));

    if (!this.editMode) {   // kliknili smo gumb za konec urejanja, editMode=false
      // urejanje je končano, sproži zahtevo za WKT, ki bo postrežena v map.service najprej v eventhandlerju
      this.mapService.setShouldEmitAddressWkt(true);
      console.log('[draw-address] Kliknil si gumb za konec urejanja!');

      this.mapService.sendAddressWkt();

      this.eventService.emitEvent(new EventModel('requestAddressWkt', null));
      console.log('[draw-parcel] Poslal event "RequestRoadWkt"');
    }
  }


  addDrawAddressInteraction() {
      //Add the draw interaction when the component is initialized
      var sourceAddresses: VectorSource = this.mapService.getLayerByTitle('Address vector')?.getSource();
      if(sourceAddresses){
        this.drawAddress = new Draw({
          source: sourceAddresses, //source of the layer where one POINT will be drawn
          type: ('Point') //geometry type
        });
        this.drawAddress.on('drawend', this.manageDrawEnd);
    
        //adds the interaction to the map. This must be done only once
        this.mapService.map!.addInteraction(this.drawAddress);
      }else{
        console.error("[Draw-Address] Error: Address layer not found");
      }
    }

  //Enables the polygons draw
  enableDrawAddress(){
    this.mapService.disableMapInteractions(); // Disable other interactions
    this.drawAddress!.setActive(true);
    this.eventService.emitEvent(new EventModel('drawAddressActivated', {}));
  }

  //Disables the polygons draw
  disableDrawAddress(){
    this.drawAddress!.setActive(false);
  }

  //Enables clear the vector layer
  clearVectorLayer(){
    this.mapService.getLayerByTitle('Address vector')?.getSource().clear();
  }
  //Reload Address WMS Layer
  reloadAddressWmsLayer(){
    this.mapService.getLayerByTitle('Address WMS')?.getSource().updateParams({"time": Date.now()})
  }


  manageDrawEnd = (e: DrawEvent) => {     // KO NEHAŠ RISAT PO KARTI, KAJ SE ZGODI POTEM POVEŠ TU !!!
    var feature = e.feature;              //this is the feature that fired the event
    var wktFormat = new WKT();            //an object to get the WKT format of the geometry
    var wktRepresentation  = wktFormat.writeGeometry(feature.getGeometry()!);   //geomertry in wkt
    console.log("[Drav-address]",wktRepresentation);                            //logs a message in console
    this.wktTransfer.sendGeometry('address', wktRepresentation);                // Pošlje geometrijo preko servisa
    this.disableDrawAddress();                                                  // rišemo samo eno točko, zato takoj izklopimo risanje 
    // this.router.navigate(['/form-address'], { queryParams: {geom: wktRepresentation }});
  }

  ngOnDestroy(): void {
    // Remove the draw interaction when the component is destroyed
    if (this.drawAddress) {
      this.mapService.map?.removeInteraction(this.drawAddress);
      console.log("[Drav-Address] Draw interaction removed");
    }
    if (this.modeSubscription) {
      this.modeSubscription.unsubscribe();
    }
  }  
}