// ---------------------------------------------------------------------
// To je profesorjev servis, za delo z karto na zaslonu. V njej podamo katere sloje imamo,
// od kod se polnijo WMS sloji, na katere sloje rišemo kakšno geometrijo,....
// ---------------------------------------------------------------------


import { Injectable } from '@angular/core';

//OpenLayers
import Map from 'ol/Map';
import View from 'ol/View';
import Layer from 'ol/layer/Layer'; // Tipo base para cualquier capa
import BaseLayer from 'ol/layer/Base'; // Puedes importarlo si lo necesi
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import { Projection } from 'ol/proj';
import LayerGroup from 'ol/layer/Group';
import MousePosition from 'ol/control/MousePosition.js';
import { createStringXY } from 'ol/coordinate.js';
import Interaction from 'ol/interaction/Interaction'; // Uvozimo razred interakcija
import MouseWheelZoom from 'ol/interaction/MouseWheelZoom'; // uvoz razreda za Zoom z kolesom miške
import DragPan from 'ol/interaction/DragPan';             // Uvoz DragPan

import { EventService } from '../services/event.service';
import { EventModel } from '../models/event.model';


//vector layers
// import { sourcesFromTileGrid } from 'ol/source';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

//layerswitcher
import LayerSwitcher from 'ol-layerswitcher';
import { SettingsService } from './settings.service';

import WKT from 'ol/format/WKT'; 
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import GeoJSON from 'ol/format/GeoJSON';// rabim za pretvorbo iz geometrije v WKT

// knjižnice za izbiranje gradnikov:
import Select from 'ol/interaction/Select';
import { click } from 'ol/events/condition';

import Modify from 'ol/interaction/Modify';  // za editiranje geometrij
import { Address } from '../models/address';
import { Road } from '../models/roads';
import { Parcel } from '../models/parcel';
import { LineString } from 'ol/geom';

import Draw from 'ol/interaction/Draw';
import Snap from 'ol/interaction/Snap';

import { Style, Stroke, Fill, Text, Circle as CircleStyle  } from 'ol/style';   // za barvo črt, polnila, ...
import { WFS } from 'ol/format';
import { bbox as bboxStrategy } from 'ol/loadingstrategy'; // za WFS servis
import { RedirectCommand } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class MapService {
  //Map can be a Map or undefined
  map: Map;
  parcelsVectorSource!: VectorSource;
  parcelsVectorLayer!: VectorLayer;
  buildingsVectorSource!: VectorSource;
  buildingsVectorLayer!: VectorLayer;
  roadsVectorSource!: VectorSource;
  roadsVectorLayer!: VectorLayer;
  addressVectorSource!: VectorSource;
  addressVectorLayer!: VectorLayer;
  highlightSource!: VectorSource;
  highlightLayer!: VectorLayer<any>;
  baseLayersGroup:LayerGroup;
  WFSLayersGroup:LayerGroup;
  myLayersGroup:LayerGroup;
  myWorkingLayersGroup:LayerGroup;
  parcelsLayer!: VectorLayer<VectorSource>;
  buildingsLayer!: VectorLayer<VectorSource>;
  roadsLayer!: VectorLayer;
  addressesLayer!: VectorLayer;
  private selectInteraction!: Select;
  private modifyInteraction?: Modify;
  private shouldEmitWkt: boolean = false;
  private editedAddressFeature: Feature | null = null;
  private editedParcelFeature: Feature | null = null;
  private editedBuildingFeature: Feature | null = null;
  private editedRoadFeature: Feature | null = null;
  private shouldEmitParcelWkt = false;
  private shouldEmitBuildingWkt = false;
  private modifyAddressInteraction?: Modify;
  private modifyParcelInteraction?: Modify;
  private modifyBuildingInteraction?: Modify;
  private shouldEmitAddressWkt = false;
  private drawInteraction: Draw | null = null;
  private snapInteraction: Snap | null = null;



  constructor(
    public settingsService: SettingsService, 
    private eventService: EventService) { 
      // Najprej ustvarimo sloje
      this.baseLayersGroup= this.createBaseLayers();   // za WMS sloje
      this.WFSLayersGroup= this.createWFSLayers();   // za WMS sloje
      this.myLayersGroup= this.createMyLayers();       // za moje WMS sloje
      this.myWorkingLayersGroup= this.createMyWorkingLayers();   // za moje delovne sloje, na katere rišem

      this.eventService.eventActivated$.subscribe(event => {
        if (event.type === 'modeChange') {
          this.handleModeChange(event.data); // 'select-parcel', 'edit-parcel', 'parcel' itd.
        } else if (event.type === 'requestParcelWkt') {
          this.sendParcelWkt();
          console.log('[Map service] Event Handler: Sproži zahtevo za WKT parcel', event.type);
        } else if (event.type === 'requestBuildingWkt') {
          this.sendBuildingWkt();
          console.log('[Map service] Event Handler: Sproži zahtevo za WKT building', event.type);
        } else if (event.type === 'requestRoadWkt') {
          this.sendRoadWkt();
          console.log('[Map service] Event Handler: Sproži zahtevo za WKT cest', event.type);
        } else if (event.type === 'requestAddressWkt') {
          this.sendAddressWkt();
          console.log('[Map service] Event Handler: Sproži zahtevo za WKT naslovov', event.type);
        }
        // lahko dodajaš še druge event tipe, če bo treba
      });

      this.map= this.createMap();//Create the map and store it in the mapService
      // this.addLayerSwitcherControl();  // to sem prestavil v map.component v ngAfterViewInit()
      this.addMousePositionControl();
  }

  // poslušamo spremembe v event-service, da to deluje moramo importirat event service, dopolnit konstruktor za map in mu povedat,
  // da je ta funkcija odgovorna za spremembe. glej vrstico 67 (malo višje) Tisto zgoraj kliče to funkcijo
  private handleModeChange(mode: string): void {
    // odstrani stare interakcije 
    this.clearInteractions();    // funkcija je takoj za to. 10 vrstic nižje
    // in aktiviraj nove
    if (mode === 'select-parcel') {
      this.activateSelectParcel();
    } else if (mode === 'select-building') {
      this.activateSelectBuilding();  
    } else if (mode === 'select-road') {
      this.activateSelectRoad(); // če selektiramo ceste, potem bomo uredili to v funkciji activateSelectRoad pojdi dol v vrstico 446
    } else if (mode === 'select-address') {
      this.activateSelectAddress(); // če selektiramo naslove, potem bomo uredili to v funkciji activateSelectAddress pojdi dol v vrstico 478 
    } else if (mode === 'edit-parcel') {
      this.activateEditParcel(); // za editiranje parcel
    } else if (mode === 'edit-building') {
      this.activateEditBuilding(); // za editiranje stavb
      console.log('[Map service]: Smo v urejanju parcel!', mode);
    } else if (mode === 'edit-road') {
      this.activateEditRoad(); // za editiranje cest
      console.log('[Map service]: Smo v urejanju cest!', mode);
    } else if (mode === 'edit-address') {
      this.activateEditAddress(); // za editiranje cest
      console.log('[Map service]: Smo v urejanju naslovov!', mode);
    } 
  }

  private clearInteractions(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
      this.selectInteraction = undefined!;
    }
  }



  // tu dodamo WMS servise na karte - povemo katere WMS servise bomo prikazovali
  createBaseLayers(): LayerGroup {    

   const kataster = new TileLayer({
      properties: { title: 'WMS Parcele' },
      source: new TileWMS({
        url: 'https://ipi.eprostor.gov.si/wms-si-gurs-kn/wms?',
        params: {
          'LAYERS': 'SI.GURS.KN:OSNOVNI_PARCELE',
          'VERSION': '1.3.0',            // iz capabilities datoteke
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'CRS': 'EPSG:3794'             // pri 1.3.0 se uporablja CRS, ne SRS
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous'
      })
    });

   const stavbe = new TileLayer({
      properties: { title: 'WMS Stavbe' },
      source: new TileWMS({
        url: 'https://ipi.eprostor.gov.si/wms-si-gurs-kn/wms?',
        params: {
          'LAYERS': 'SI.GURS.KN:OSNOVNI_STAVBE',
          'VERSION': '1.3.0',            // iz capabilities datoteke
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'CRS': 'EPSG:3794'             // pri 1.3.0 se uporablja CRS, ne SRS
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous'
      })
    });


   const dof = new TileLayer({
      properties: { title: 'WMS DOF25' },
      source: new TileWMS({
        url: 'https://ipi.eprostor.gov.si/wms-si-gurs-dts/wms?',
        params: {
          'LAYERS': 'SI.GURS.ZPDZ:DOF025',
          'VERSION': '1.3.0',            // iz capabilities datoteke
          'FORMAT': 'image/png',
          'TRANSPARENT': true,
          'CRS': 'EPSG:3794'             // pri 1.3.0 se uporablja CRS, ne SRS
        },
        serverType: 'geoserver',
        crossOrigin: 'anonymous'
      })
    });


    const baseLayersGroup = new LayerGroup({
        properties: {
          title: 'WMS GURS',
        },
        visible: false,
        layers: [kataster, stavbe, dof]
      });
    return baseLayersGroup;
  }



   // WFS
   createWFSLayers(): LayerGroup {

   // WFS layer: NEP_KATASTRSKE_OBCINE
    const ko = new VectorLayer({
      properties: { title: 'WFS Katastrske Občine' },
      source: new VectorSource({
        format: new GeoJSON(),
        url: 'https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs?' +
            'service=WFS&version=2.0.0&request=GetFeature&' +
            'typeName=SI.GURS.KN:KATASTRSKE_OBCINE&' +
            'srsName=EPSG:3794&outputFormat=application/json'
      }),
      style: function (feature) {
        return new Style({
          stroke: new Stroke({
            color: 'green',
            width: 1
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.05)'
          }),
          text: new Text({
            text: feature.get('NAZIV') || '', 
            font: '12px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'Green', width: 1 }),
            overflow: true,
          })
        });
      }
    });


    const wfs_parcele = new VectorLayer({
      properties: { title: 'WFS Parcele' },
      source: new VectorSource({
        format: new GeoJSON(),
        url: 'https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs?' +
            'service=WFS&version=2.0.0&request=GetFeature&' +
            'typeName=SI.GURS.KN:PARCELE&' +
            'srsName=EPSG:3794&outputFormat=application/json&'+
            'CQL_FILTER=KO_ID=850',                                   // da se ne prenaša preveč podatkov
      }),
      style: function (feature) {
        return new Style({
          stroke: new Stroke({
            color: 'green',
            width: 1
          }),
          fill: new Fill({
            color: 'rgba(0, 255, 0, 0.05)'
          }),
          text: new Text({
            text: feature.get('ST_PARCELE') || '',     // ime polja v WFS servisu, ne ime polja iz Postgres baze !
            font: '12px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'Green', width: 1 }),
            overflow: true,
          })
        });
      }
    });


    const wfs_stavbe = new VectorLayer({
      properties: { title: 'WFS Stavbe' },
      source: new VectorSource({
        format: new GeoJSON(),
        url: 'https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs?' +
            'service=WFS&version=2.0.0&request=GetFeature&' +
            'typeName=SI.GURS.KN:STAVBE_OBRIS&' +
            'srsName=EPSG:3794&outputFormat=application/json&'+
            'CQL_FILTER=KO_ID=850',                                 // da se ne prenaša preveč podatkov
      }),
      style: function (feature) {
        return new Style({
          stroke: new Stroke({
            color: 'red',
            width: 1
          }),
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.05)'     // RGB format Red, Green, Blue, Opacity oz. prosojnost
          }),
          text: new Text({
            text: feature.get('ST_STAVBE') || '',    // ime polja v WFS servisu, ne ime polja iz Postgres baze !
            font: '12px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'Red', width: 1 }),
            overflow: true,
          })
        });
      }
    });


    const wfs_obcine = new VectorLayer({
      properties: { title: 'WFS RPE Občine' },
      source: new VectorSource({
        format: new GeoJSON(),
        url: 'https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs?' +    // link je malenkost drugačen kot zgoraj, rpe
            'service=WFS&version=2.0.0&request=GetFeature&' +
            'typeName=SI.GURS.RPE:OBCINE&' +
            'srsName=EPSG:3794&outputFormat=application/json'     // Ni filtra prenašamo cel sloj
      }),
      style: function (feature) {
        return new Style({
          stroke: new Stroke({
            color: '#666666', // siva obroba
            width: 1
          }),
          fill: new Fill({
            color: 'rgba(255, 255, 255, 0.05)'     // Bela barva - RGB format Red, Green, Blue, Opacity oz. prosojnost
          }),
          text: new Text({
            text: feature.get('NAZIV') || '',    // ime polja v WFS servisu, ne ime polja iz Postgres baze !
            font: '20px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'white', width: 2 }),
            overflow: true,
          })
        });
      }
    });


      // WFS grupa
      const WFSLayersGroup = new LayerGroup({
        properties: { title: 'WFS GURS' },
        visible: false,
        layers: [ko, wfs_parcele, wfs_stavbe, wfs_obcine]  // lahko dodaš več slojev, kot pri WMS
      });

      return WFSLayersGroup;
    }







  // tu imamo svoje WMS layerje
  createMyLayers(): LayerGroup {
    var parcels= new TileLayer({
        properties: {
          title: 'WMS Parcel'
        },
        source: new TileWMS({
          url: this.settingsService.GEOSERVER_URL + 'wms?',
          params: {
            'LAYERS': 'parcels_parcels', 'VERSION': '1.3.0', 'TILED': true, 'TRANSPARENT': true, 'FORMAT': 'image/png'
          }
        })
      });

    var buildings= new TileLayer({
        properties: {
          title: 'WMS Stavb'
        },
        source: new TileWMS({
          url: this.settingsService.GEOSERVER_URL + 'wms?',
          params: {
            'LAYERS': 'buildings_buildings', 'VERSION': '1.3.0', 'TILED': true, 'TRANSPARENT': true, 'FORMAT': 'image/png'
          }
        })
      });      
    
    var roads= new TileLayer({
        // visible: true,
        properties: {
          title: 'WMS Cest'
        },
        source: new TileWMS({
          url: this.settingsService.GEOSERVER_URL + 'wms?',
          params: {
            'LAYERS': 'roads_roads', 'VERSION': '1.3.0', 'TILED': true, 'TRANSPARENT': true, 'FORMAT': 'image/png'
          }
        })
      });  

    var addresses= new TileLayer({
        properties: {
          title: 'WMS Naslovov'
        },
        source: new TileWMS({
          url: this.settingsService.GEOSERVER_URL + 'wms?',
          params: {
            'LAYERS': 'addresses_addresses', 'VERSION': '1.3.0', 'TILED': true, 'TRANSPARENT': true, 'FORMAT': 'image/png'
          }
        })
      });    

      // Moji 4 WMS layerji iz mojega Geoserverja
      var myLayersGroup = new LayerGroup({
        properties: {
          title: 'Moji WMS sloji'
        },
        visible: false,
        layers: [
          parcels, 
          buildings,
          roads, 
          addresses
        ]
      });
    return myLayersGroup;
  }
    




      
   // delovni sloji s podatki iz Postgres baze
   createMyWorkingLayers(): LayerGroup {
     this.parcelsVectorSource = new VectorSource({wrapX: false}); 
     this.parcelsVectorLayer = new VectorLayer({
       source: this.parcelsVectorSource,
       style: (feature: any, resolution: number) => {
        const minResolution = 1; // prilagodimo svojim potrebam
       
        if (resolution > minResolution) {
          // Ne prikazuj label (lahko vrneš samo osnovni stil brez teksta ali null)
          return new Style({
            stroke: new Stroke({
              color: 'green',
              width: 2,
            }),
            fill: new Fill({
              color: 'rgba(0, 255, 0, 0.1)',
            }),
          });
        }
        // Prikazuj labelo
        return new Style({
          stroke: new Stroke({
            color: 'green',
            width: 2,
          }),
          fill: new Fill({
            color: 'rgba(0, 255, 0, 0.1)',
       }),
       text: new Text({
          text: feature.get('parc_st') || '',  // <-- labela iz atributa
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          overflow: true,
          placement: 'point',
       }),
     });
    },
       properties: {
         title: 'Vektorski sloj parcel' // <--- Define el título aquí
         // Po potrebi lahko tukaj dodate še druge lastnosti po meri.
         // Na primer: isBaseLayer: false, opis: 'Gradnja plasti'
     }   
   })
   this.parcelsLayer = this.parcelsVectorLayer;





    // sloj za označevanje
    this.highlightSource = new VectorSource();
    this.highlightLayer = new VectorLayer({
      source: this.highlightSource,
      style: new Style({
        stroke: new Stroke({
          color: 'magenta',       // '#ffff00',  rumena barva bi tudi lahko bila
          width: 5
        }),
        fill: new Fill({
          color: 'rgba(255,255,0,0)' // brez polnila
        })
      }),
      // properties: { 
      //   title: 'Highlight sloj',                                   // FINTA če ni title ne pride na seznam slojev !!!  
      // },
      zIndex: 200 // nad osnovnimi sloji
    });






     // delovni sloj za stavbe
     this.buildingsVectorSource = new VectorSource({wrapX: false}); 
     this.buildingsVectorLayer = new VectorLayer({
     source: this.buildingsVectorSource,
     style: (feature: any, resolution: number) => {                        // dodan stil za labele
        const minResolution = 1; // prilagodimo svojim potrebam
       
        if (resolution > minResolution) {
          // Ne prikazuj label (lahko vrneš samo osnovni stil brez teksta ali null)
          return new Style({
            stroke: new Stroke({
              color: 'red',
              width: 2,
            }),
            fill: new Fill({
              color: 'rgba(255, 0, 0, 0.1)',
            }),
          });
        }
        // Prikazuj labelo
        return new Style({
          stroke: new Stroke({
            color: 'red',
            width: 2,
          }),
          fill: new Fill({
            color: 'rgba(255, 0, 0, 0.1)',
       }),
       text: new Text({
          text: feature.get('st_stavbe') || '',  // <-- labela iz atributa
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          overflow: true,
          placement: 'point',
       }),
     });
    },
    properties: {
      title: 'Vektorski sloj stavb',
    },
   });
   this.buildingsLayer = this.buildingsVectorLayer;




    // dellovni sloj za ceste
    this.roadsVectorSource = new VectorSource({wrapX: false}); 
    this.roadsVectorLayer = new VectorLayer({
    source: this.roadsVectorSource,
    style: (feature: any, resolution: number) => {                        // dodan stil za labele
        const minResolution = 1; // prilagodimo svojim potrebam
       
        if (resolution > minResolution) {
          // Ne prikazuj label (lahko vrneš samo osnovni stil brez teksta ali null)
          return new Style({
            stroke: new Stroke({
              color: 'gray',
              width: 2,
            }),
          });
        }
        // Prikazuj labelo
        return new Style({
          stroke: new Stroke({
            color: 'gray',
            width: 2,
          }),
       text: new Text({
          text: feature.get('str_name') || '',  // <-- labela iz atributa
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          overflow: true,
          placement: 'point',
       }),
     });
    },
      properties: {
        title: 'Vektorski sloj cest' 
        // Po potrebi lahko tukaj dodate še druge lastnosti po meri.
        // Na primer: isBaseLayer: false, opis: 'Gradnja plasti'
      }   
    })
    this.roadsLayer = this.roadsVectorLayer;    
    


    
    // delovni sloj za naslove
    this.addressVectorSource = new VectorSource({wrapX: false}); 
    this.addressVectorLayer = new VectorLayer({
      source: this.addressVectorSource,
      style: (feature: any, resolution: number) => {                        // dodan stil za labele
        const minResolution = 1; // prilagodimo svojim potrebam
       
        // Skupne lastnosti (barve ipd.)
        const circle = new CircleStyle({
          radius: 4,
          fill: new Fill({ color: 'yellow' }),  // rumen krogec
          stroke: new Stroke({ color: '#000', width: 1 }),
        });
        if (resolution > minResolution) {
          // Ne prikazuj label (lahko vrneš samo osnovni stil brez teksta ali null)
          return new Style({
            image: circle,
          });
        }
        // Prikazuj labelo
        return new Style({
          image: circle,
          stroke: new Stroke({
            color: 'blue',
            width: 2,
          }),
          fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)',
       }),
       text: new Text({
          text: `${feature.get('street') || ''} ${feature.get('house_num') || ''}`,  // <-- labela iz atributa
          font: '12px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({ color: '#fff', width: 2 }),
          offsetX: 10,              // zamik desno (v piksljih)
          textAlign: 'left',        // besedilo se začne levo od izhodišča (torej desno od točke)
          overflow: true,
          placement: 'point',
       }),
     });
    },
      properties: {
        title: 'Vektorski sloj Naslovov' 
      }   
    });
    this.addressesLayer = this.addressVectorLayer;  
                         


    // delovni sloj za naslove
    // var addressVectorSource = new VectorSource({wrapX: false}); 
    // var addressVectorLayer = new VectorLayer({
    //   source: addressVectorSource,
    //   properties: {
    //     title: 'Vektorski sloj Naslovov' 
        // Po potrebi lahko tukaj dodate še druge lastnosti po meri.
        // Na primer: isBaseLayer: false, opis: 'Gradnja plasti'
    //   }   
    // });//The layer were we will draw
    // this.addressesLayer = addressVectorLayer;





    

    var myWorkingLayersGroup = new LayerGroup({
        properties: {
          title: 'Moji delovni sloji'
        },
        layers: [
          this.parcelsVectorLayer,
          this.buildingsVectorLayer,
          this.roadsVectorLayer,
          this.addressVectorLayer,
          // this.highlightLayer
        ]
      });
    return myWorkingLayersGroup;
  }

  

  createMap(): Map { 
    let epsg3794:Projection;
    epsg3794=new Projection({
      code:'EPSG:3794',
      extent: [502142.40,149803.02,509320.52,155375.95],
      units: 'm'
    });
    this.map = new Map({
      controls: [],
      view: new View({
        center: [506231,152039],
        zoom: 1,
        projection: epsg3794,
      }),
      layers: [
        this.baseLayersGroup, 
        this.WFSLayersGroup, 
        this.myLayersGroup, 
        this.myWorkingLayersGroup
      ],
      target: undefined
    }); 
    //  Dodamo highlight sloj neposredno na karto (zunaj skupin), da ga uporabnik ne more izklopit
    if (this.highlightLayer) {
        this.map.addLayer(this.highlightLayer);
    }
    return this.map;
  }

  addLayerSwitcherControl() {
    const layerSwitcher = new LayerSwitcher(
      {
        activationMode: 'mouseover',
        startActive: false,
        tipLabel: 'Show-hide layers',
        groupSelectStyle: 'group',
        reverse: false
      }
    );
    this.map.addControl(layerSwitcher); //! --> tells typescript that map is not undefined
  }

  addMousePositionControl(){
      //Adds the mouse coordinate position to the map
      const mousePositionControl = new MousePosition({
        coordinateFormat: createStringXY(0),
        projection: 'EPSG:3794',
        // comment the following two lines to have the mouse position
        // be placed within the map.
        //className: 'custom-mouse-position',
        //target: document.getElementById('map_mouse_position_control'),
        //undefinedHTML: '----------------------'
      });
      this.map.addControl(mousePositionControl);//! --> tells typescript that map is not undefined
  }

  /**
   * Poiščite plast na zemljevidu (ali znotraj skupin plasti) po njeni lastnosti »title«.
   *
   * @param title Naslov sloja, ki ga želite iskati.
   * @param layers Zbirka plasti za pridobivanje (običajno map.getLayers() ali group.getLayers()).
   * @returns Objekt plasti, če je najden, ali ni definiran.
   */
  getLayerByTitle(title: string, layers?: BaseLayer[]): Layer<any> | undefined {
    // Če zbirka slojev ni podana, začnemo od korena zemljevida
    const currentLayers = layers || this.map.getLayers().getArray();

    for (const baseLayer of currentLayers) {
      // 1. Preverite, ali gre za plast in ali ima naslov
      if (this.isLayer(baseLayer)) {
        const layerProperties = baseLayer.getProperties();
        if (layerProperties && layerProperties['title'] === title) {
          //console.log(`Sloj '${title}' je najden!`, baseLayer);
          return baseLayer;
        }
      }
      // 2. Comprobar si es un LayerGroup y buscar recursivamente dentro de él
      else if (this.isLayerGroup(baseLayer)) {
        //console.log(`Vnos skupine slojev: ${baseLayer.getProperties()['title'] || 'Unnamed Group'}`);
        const foundLayerInGroup = this.getLayerByTitle(title, baseLayer.getLayers().getArray());
        if (foundLayerInGroup) {
          return foundLayerInGroup; // V tej skupini najdena plast
        }
      }
    }
    //console.log(`Sloj '${title}' ni bil najden v trenutni hierarhiji.`);
    return undefined; // Na tej ravni ali njenih podskupinah ni bilo mogoče najti nobene plasti s tem naslovom.
  }

  /**
 * Funkcija Type guard za ugotavljanje, ali je BaseLayer sloj (in ne skupina slojev).
 * @param layer Objekt BaseLayer, ki ga je treba preveriti.
 * @returns Vrednost »true«, če je objekt primerek razreda ol/layer/Layer, sicer vrednost »false«.
 */
  private isLayer(layer: BaseLayer): layer is Layer<any> {
    // Robusten način je preveriti, ali ima metodo getSource.
    // Skupina plasti nima funkcije getSource.
    return (layer as Layer<any>).getSource !== undefined;

    // Drug način, če je ol/layer/Layer konkreten razred in ne abstrakten v vaši različici:
    // vrni plast primerek plasti; // To lahko povzroči težave, če je sloj abstrakten ali če uvoz ni neposreden.
    // Preverjanje `getSource` je v tem primeru zanesljivejše.
  } 

  // Pomočnik za preverjanje, ali je BaseLayer skupina slojev (in ima .getLayers())
  private isLayerGroup(layer: BaseLayer): layer is LayerGroup {
    return (layer as LayerGroup).getLayers !== undefined;
  }

  disableMapInteractions(): void {
    if (this.map) {
      this.map.getInteractions().forEach((interaction: Interaction) => {
        console.log('[map.service] Interaction:', interaction);
        // Preveri, ali interakcija NI primerek MouseWheelZoom ali DragPan
        if (!(interaction instanceof MouseWheelZoom) && !(interaction instanceof DragPan)) {
          interaction.setActive(false);
        }
      });
    }
  }


  // ta funkcija nariše eno parcelo, ko kliknemo na ID v tabeli parcel
  public addParcelsGeoJsonToLayer(geojsonStr: string) {
    console.log('[addParcelsGeoJsonToLayer] Prejeto GeoJSON:', geojsonStr);
    const format = new GeoJSON();
    const features = format.readFeatures(geojsonStr, {
      featureProjection: 'EPSG:3794'
    });
    console.log(`[addParcelsGeoJsonToLayer] Parsed features count: ${features.length}`);
    features.forEach((f, i) => console.log(`Feature ${i}:`, f));
    const source = this.parcelsLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('parcelsLayer ali njegov source ne obstaja!');
    }
  }



  // ta funkcija nariše eno stavbo, ko kliknemo na ID v tabeli stavb
  public addBuildingsGeoJsonToLayer(geojsonStr: string) {
    console.log('[addBuildingssGeoJsonToLayer] Prejeto GeoJSON:', geojsonStr);
    const format = new GeoJSON();
    const features = format.readFeatures(geojsonStr, {
      featureProjection: 'EPSG:3794'
    });
    console.log(`[addBuildingsGeoJsonToLayer] Parsed features count: ${features.length}`);
    features.forEach((f, i) => console.log(`Feature ${i}:`, f));
    const source = this.buildingsLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('BuildingsLayer ali njegov source ne obstaja!');
    }
  }  



    // ta funkcija nariše eno cesto, ko kliknemo na link ID v tabeli stavb
  public addOneRoadGeoJsonToLayer(geojsonStr: string) {
    console.log('[addRoadsGeoJsonToLayer] Prejeto GeoJSON:', geojsonStr);
    const format = new GeoJSON();
    const features = format.readFeatures(geojsonStr, {
      featureProjection: 'EPSG:3794'
    });
    console.log(`[addRoadsGeoJsonToLayer] Parsed features count: ${features.length}`);
    features.forEach((f, i) => console.log(`Feature ${i}:`, f));
    const source = this.roadsLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('RoadsLayer ali njegov source ne obstaja!');
    }
  }  




  public addOneAddressGeoJsonToLayer(geojsonStr: string) {
    console.log('[addAddresssGeoJsonToLayer] Prejeto GeoJSON:', geojsonStr);
    const format = new GeoJSON();
    const features = format.readFeatures(geojsonStr, {
      featureProjection: 'EPSG:3794'
    });
    console.log(`[addAddressGeoJsonToLayer] Parsed features count: ${features.length}`);
    features.forEach((f, i) => console.log(`Feature ${i}:`, f));
    const source = this.addressesLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('AddressLayer ali njegov source ne obstaja!');
    }
  }  



  // ta funkcija nariše vse parcele ki so prikazane v tabeli na Karto
  public addAllParcelsGeoJsonToLayer(parcels: any[]) {
  const validGeoJSONs = parcels
    .map(Parcel => {
      try {
        return JSON.parse(Parcel.geom_geojson);
      } catch (e) {
        console.warn('Neveljaven GeoJSON za parcelni ID:', Parcel.id);
        return null;
      }
    })
    .filter(g => g !== null);

  if (validGeoJSONs.length === 0) return;

  const featureCollection = {
    type: 'FeatureCollection',
    features: validGeoJSONs
  };

  const format = new GeoJSON();
  const features = format.readFeatures(featureCollection, {
    featureProjection: 'EPSG:3794'
  });

  features.forEach((feature, i) => {
    const parcelData = parcels[i];
    feature.setProperties({
      id: parcelData.id,
      parc_st: parcelData.parc_st,
      sifko: parcelData.sifko,
      area: parcelData.area,
      geom_wkt: parcelData.geom_wkt
    });
  });

  const source = this.parcelsLayer?.getSource();
  if (source) {
    source.clear();
    source.addFeatures(features);

    // Tukaj emit-aš dogodek PO tem, ko so feature-ji dodani
    this.eventService.emitEvent(new EventModel('parcelsAddedToMap', null));

  } else {
    console.warn('parcelsLayer ali njegov source ne obstaja!');
  }
}



  // ta funkcija nariše vse stavbe ki so prikazane v tabeli na Karto
  public addAllBuildingsGeoJsonToLayer(buildings: any[]) {
  const validGeoJSONs = buildings
    .map(Building => {
      try {
        return JSON.parse(Building.geom_geojson);
      } catch (e) {
        console.warn('Neveljaven GeoJSON za ID stavbe:', Building.id);
        return null;
      }
    })
    .filter(g => g !== null);
  if (validGeoJSONs.length === 0) return;
  const featureCollection = {
    type: 'FeatureCollection',
    features: validGeoJSONs
  };
  const format = new GeoJSON();
  const features = format.readFeatures(featureCollection, {
    featureProjection: 'EPSG:3794'
  });
  features.forEach((feature, i) => {
    const buildingData = buildings[i];
    feature.setProperties({
      id: buildingData.id,
      sifko: buildingData.sifko,
      st_stavbe: buildingData.st_stavbe,
      description: buildingData.description,
      area: buildingData.area,
      geom_wkt: buildingData.geom_wkt
    });
  });
  const source = this.buildingsLayer?.getSource();
  if (source) {
    source.clear();
    source.addFeatures(features);

    // Tukaj emit-aš dogodek PO tem, ko so feature-ji dodani
    this.eventService.emitEvent(new EventModel('buildingsAddedToMap', null));

  } else {
    console.warn('BuildingsLayer ali njegov source ne obstaja!');
  }
}





  // ta funkcija nariše vse ceste ki so prikazane v tabeli na Karto
  public addRoadsGeoJsonToLayer(roads: any[]) {
    const validGeoJSONs = roads
      .map(road => {
        try {
          return JSON.parse(road.geom_geojson);
        } catch (e) {
          console.warn('Neveljaven GeoJSON za cestni ID:', road.id);
          return null;
        }
      })
      .filter(g => g !== null);

    if (validGeoJSONs.length === 0) return;

    const featureCollection = {
      type: 'FeatureCollection',
      features: validGeoJSONs
    };

    const format = new GeoJSON();
    const features = format.readFeatures(featureCollection, {
      featureProjection: 'EPSG:3794'
    });

    features.forEach((feature, i) => {
      const roadData = roads[i]; // ustrezni zapis iz tabele
      feature.setProperties({
        id: roadData.id,
        str_name: roadData.str_name,
        administrator: roadData.administrator,
        maintainer: roadData.maintainer,
        length: roadData.length,
        geom_wkt: roadData.geom_wkt
      });
    });

    const source = this.roadsLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('roadsLayer ali njegov source ne obstaja!');
    }
  }

    // funkcija izriše vse točke ki so prikazane v tabeli na Karto.
    // namenjena je tabeli naslovov
    public addAddressesGeoJsonToLayer(address: any[]) {
    const validGeoJSONs = address
      .map(address => {
        try {
          return JSON.parse(address.geom_geojson);
        } catch (e) {
          console.warn('Neveljaven GeoJSON za address ID:', address.id);
          return null;
        }
      })
      .filter(g => g !== null);

    if (validGeoJSONs.length === 0) return;

    const featureCollection = {
      type: 'FeatureCollection',
      features: validGeoJSONs
    };

    const format = new GeoJSON();
    const features = format.readFeatures(featureCollection, {
      featureProjection: 'EPSG:3794'
    });

    features.forEach((feature, i) => {
      const addressData = address[i]; // ustrezni zapis iz tabele
      feature.setProperties({
        id: addressData.id,
        building_num: addressData.building_num,
        street: addressData.street,
        house_num: addressData.house_num,
        post_num: addressData.post_num,
        post_name: addressData.post_name,
        geom_wkt: addressData.geom_wkt
      });
    });

    const source = this.addressesLayer?.getSource();
    if (source) {
      source.clear();
      source.addFeatures(features);
    } else {
      console.warn('addressLayer ali njegov source ne obstaja!');
    }
  }

  // SELECT parcel
  private activateSelectParcel(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
    }

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.parcelsLayer]
    });

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature) {
        // const wktFormat = new WKT();
        // const geometry = feature.getGeometry() as Geometry;
        // const wkt = wktFormat.writeGeometry(geometry);

        // Sporoči naprej ( z EventService), da je parcela izbrana. Treba jo bo prenest v vnosno formo.
        // Tisti, ki mu je namenjeno to sporočilo že ve, in čaka nanj. To je seveda parcel-form.component.
        const podatki = feature.getProperties();
        console.log('[map.service] activateSelectParcel, podatki so: ', podatki)
        this.eventService.emitEvent(new EventModel('parcel-selected', podatki));
      }
    });
    this.map.addInteraction(this.selectInteraction);
  }


  // SELECT building
  private activateSelectBuilding(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
    }

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.buildingsLayer]
    });

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature) {
        // const wktFormat = new WKT();
        // const geometry = feature.getGeometry() as Geometry;
        // const wkt = wktFormat.writeGeometry(geometry);

        // Sporoči naprej ( z EventService), da je parcela izbrana. Treba jo bo prenest v vnosno formo.
        // Tisti, ki mu je namenjeno to sporočilo že ve, in čaka nanj. To je seveda parcel-form.component.
        const podatki = feature.getProperties();
        console.log('[map.service] activateSelectBuilding, podatki so: ', podatki)
        this.eventService.emitEvent(new EventModel('building-selected', podatki));
      }
    });
    this.map.addInteraction(this.selectInteraction);
  }  
  

  // SELECT road
  private activateSelectRoad(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
    }

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.roadsLayer]
    });

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature) {
        // const wktFormat = new WKT();
        // const geometry = feature.getGeometry() as Geometry;
        // const wkt = wktFormat.writeGeometry(geometry);

        // Sporoči naprej ( z EventService), da je cesta izbrana. Torej jo bo treba prenest v vnosno formo
        const podatki = feature.getProperties();
        console.log('[map.service] activateSelectRoad, podatki so: ', podatki)
        this.eventService.emitEvent(new EventModel('road-selected', podatki));
      }
    });
    this.map.addInteraction(this.selectInteraction);
  }  

  // SELECT naslov oz. address
  private activateSelectAddress(): void {
    if (this.selectInteraction) {
      this.map.removeInteraction(this.selectInteraction);
    }

    this.selectInteraction = new Select({
      condition: click,
      layers: [this.addressesLayer]
    });

    this.selectInteraction.on('select', (e) => {
      const feature = e.selected[0];
      if (feature) {
        // const wktFormat = new WKT();
        // const geometry = feature.getGeometry() as Geometry;
        // const wkt = wktFormat.writeGeometry(geometry);

        // Sporoči naprej ( z EventService), da je naslov izbran. Torej ga je treba prenest v vnosno formo...
        const podatki = feature.getProperties();
        console.log('[map.service] activateSelectAddress, podatki so: ', podatki)
        this.eventService.emitEvent(new EventModel('address-selected', podatki));  // tu sporočamo (emitiramo) naprej
      }
    });
    this.map.addInteraction(this.selectInteraction);
  }  

  private activateEditParcel(): void {
    const vectorSource: VectorSource = this.parcelsLayer.getSource() as VectorSource;
    this.modifyParcelInteraction = new Modify({ source: vectorSource });
    this.modifyParcelInteraction.on('modifyend', (e) => {
      const feature = e.features.item(0);
      if (feature) {
         this.editedParcelFeature = feature;
         const props = feature.getProperties();
         console.log('[Map service] Parcela spremenjena, podatki:', props);
         console.log('Parcela spremenjena:', e.features.getArray());

         if (this.shouldEmitWkt) {
          console.log('[Map service] shouldEmitWkt = true. Kličem sendRoadWkt()');
          this.sendRoadWkt();
          this.shouldEmitWkt = false;
        } else {
          console.log('[Map service] shouldEmitWkt = false. Ne pošiljam.');
        }
      }
    });
    this.map.addInteraction(this.modifyParcelInteraction);
  }

  private activateEditBuilding(): void {
    const vectorSource: VectorSource = this.buildingsLayer.getSource() as VectorSource;
    this.modifyBuildingInteraction = new Modify({ source: vectorSource });
    this.modifyBuildingInteraction.on('modifyend', (e) => {
      const feature = e.features.item(0);
      if (feature) {
         this.editedBuildingFeature = feature;
         const props = feature.getProperties();
         console.log('[Map service] Stavba spremenjena, podatki:', props);
         console.log('Stavba spremenjena:', e.features.getArray());

         if (this.shouldEmitWkt) {
          console.log('[Map service] shouldEmitWkt = true. Kličem sendBuildingWkt()');
          this.sendRoadWkt();
          this.shouldEmitWkt = false;
        } else {
          console.log('[Map service] shouldEmitWkt = false. Ne pošiljam.');
        }
      }
    });
    this.map.addInteraction(this.modifyBuildingInteraction);
  }  


  public sendParcelWkt(): void {
    if (!this.editedParcelFeature) {
      console.warn('Ni urejene feature za pošiljanje!');
      return;
    }
    const geometry = this.editedParcelFeature.getGeometry();
    if (!geometry) {
      console.warn('[Map service] Feature parcel nima geometrije!');
      return;
    }
    const wktFormat = new WKT();
    const wkt = wktFormat.writeGeometry(geometry);
    const podatki = {
      id: this.editedParcelFeature.get('id'),
      parc_st: this.editedParcelFeature.get('parc_st'),
      sifko: this.editedParcelFeature.get('sifko'),
      area: this.editedParcelFeature.get('area'),
      geom_wkt: wkt 
    };
    console.log('[Map service] sendParcelWKT: Sending parcel data:', podatki);
    this.eventService.emitEvent(new EventModel('parcelEdited', podatki));
  }


  public sendBuildingWkt(): void {
    if (!this.editedBuildingFeature) {
      console.warn('Ni urejene feature za pošiljanje!');
      return;
    }
    const geometry = this.editedBuildingFeature.getGeometry();
    if (!geometry) {
      console.warn('[Map service] Feature building nima geometrije!');
      return;
    }
    const wktFormat = new WKT();
    const wkt = wktFormat.writeGeometry(geometry);
    const podatki = {
      id: this.editedBuildingFeature.get('id'),
      parc_st: this.editedBuildingFeature.get('parc_st'),
      sifko: this.editedBuildingFeature.get('sifko'),
      area: this.editedBuildingFeature.get('area'),
      geom_wkt: wkt 
    };
    console.log('[Map service] sendBuildingWKT: Sending building data:', podatki);
    this.eventService.emitEvent(new EventModel('buildingEdited', podatki));
  }


  public setShouldEmitParcelWkt(value: boolean): void {
    this.shouldEmitParcelWkt = value;
  }

  public setShouldEmitBuildingWkt(value: boolean): void {
    this.shouldEmitBuildingWkt = value;
  }


  private activateEditRoad(): void {
    const vectorSource: VectorSource = this.roadsLayer.getSource() as VectorSource;
    this.modifyInteraction = new Modify({ source: vectorSource });

    this.modifyInteraction.on('modifyend', (e) => {
      const feature = e.features.item(0);
      console.log('[Map service] modifyend event!');
      if (feature) {
         this.editedRoadFeature = feature;
         console.log('[Map service] Spremenjen feature:', feature);
         const props = feature.getProperties();
         console.log('[Map service] Cesta spremenjena, podatki:', props);
         console.log('Road spremenjen:', e.features.getArray());

        if (this.shouldEmitWkt) {
          console.log('[Map service] shouldEmitWkt = true. Kličem sendRoadWkt()');
          this.sendRoadWkt();
          this.shouldEmitWkt = false;
        } else {
          console.log('[Map service] shouldEmitWkt = false. Ne pošiljam.');
        }
      }
    });
    this.map.addInteraction(this.modifyInteraction);
  }


  public sendRoadWkt(): void {
    if (!this.editedRoadFeature) {
      console.warn('[Map service] Ni urejene cestne feature za pošiljanje!');
      return;
    }
    const geometry = this.editedRoadFeature.getGeometry();
    if (!geometry) {
      console.warn('[Map service] Feature road nima geometrije!');
      return;
    }
    if (geometry instanceof LineString) {
      console.log('[Map service] Trenutna geometrija (LineString):', geometry.getCoordinates());
    }
    const wktFormat = new WKT();
    const wkt = wktFormat.writeGeometry(geometry);
    const podatki = {
      id: this.editedRoadFeature.get('id'),
      str_name: this.editedRoadFeature.get('str_name'),
      administrator: this.editedRoadFeature.get('administrator'),
      maintainer: this.editedRoadFeature.get('maintainer'),
      length: this.editedRoadFeature.get('length'),
      geom_wkt: wkt
    };
    console.log('[Map service] sendRoadWKT: Pošiljam WKT geometrijo:', podatki);
    this.eventService.emitEvent(new EventModel('roadEdited', podatki));
  }


  public setShouldEmitWkt(value: boolean): void {
    this.shouldEmitWkt = value;
  }


  private activateEditAddress(): void {
    const vectorSource: VectorSource = this.addressesLayer.getSource() as VectorSource;
    this.modifyAddressInteraction = new Modify({ source: vectorSource });

    this.modifyAddressInteraction.on('modifyend', (e) => {
      const feature = e.features.item(0);
      if (feature) {
         this.editedAddressFeature = feature;
         const props = feature.getProperties();
         console.log('[Map service] Naslov spremenjen, podatki:', props);

         if (this.shouldEmitWkt) {
           console.log('[Map service] shouldEmitWkt = true. Kličem sendRoadWkt()');
           this.sendRoadWkt();
           this.shouldEmitWkt = false;
        } else {
           console.log('[Map service] shouldEmitWkt = false. Ne pošiljam.');
        }
      }
    });
    this.map.addInteraction(this.modifyAddressInteraction);
  }



  // mora poslati podatke v Feture + predelani WKT (ker smo premikali točke)
  public sendAddressWkt(): void {
    if (!this.editedAddressFeature) {
      console.warn('[Map service] Ni izbrane editedAddressFeature!');
      return;
    }
    const geometry = this.editedAddressFeature.getGeometry();
    if (!geometry) {
      console.warn('[Map service] editedAddressFeature nima geometrije!');
      return;
    }
    const wktFormat = new WKT();
    const wkt = wktFormat.writeGeometry(geometry);
    const podatki = {
      id: this.editedAddressFeature.get('id'),
      building_num: this.editedAddressFeature.get('building_num'),
      street: this.editedAddressFeature.get('street'),
      house_num: this.editedAddressFeature.get('house_num'),
      post_num: this.editedAddressFeature.get('post_num'),
      post_name: this.editedAddressFeature.get('post_name'),
      geom_wkt: wkt
    };
    console.log('[Map service] sendAddressWKT: Pošiljam posodobljene podatke:', podatki);
    this.eventService.emitEvent(new EventModel('addressEdited', podatki));
  }

  public setShouldEmitAddressWkt(value: boolean): void {
    this.shouldEmitAddressWkt = value;
  }


  
  public clearDrawInteraction(): void {
    if (this.drawInteraction) {
      this.map?.removeInteraction(this.drawInteraction);
      this.drawInteraction = null;
    }

    if (this.snapInteraction) {
      this.map?.removeInteraction(this.snapInteraction);
      this.snapInteraction = null;
    }
  }

  
  public getWktFromFeature(feature: any): string {
    const wkt = new WKT();
    return wkt.writeFeature(feature);
  }



  public startDrawingParcels(): void {
    if (!this.map || !this.parcelsLayer) {
      console.warn('Map ali parcelsLayer ni inicializiran');
      return;
    }

    const source = this.parcelsLayer.getSource();
    if (!source) {
      console.warn('Manjka parcelsLayer source');
      return;
    }

    this.clearDrawInteraction(); // najprej počistimo prejšnje

    this.drawInteraction = new Draw({
      source: source,
      type: 'Polygon',
    });

    this.snapInteraction = new Snap({
      source: source,
    });

    this.map.addInteraction(this.drawInteraction);
    this.map.addInteraction(this.snapInteraction);

    this.drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      const wkt = this.getWktFromFeature(feature);
      console.log('Risanje zaključeno. WKT:', wkt);
      // this.sendParcelWkt(wkt);
    });
  }





  // Funkcija za označitev parcele na karti, ko kliknemo gumb EDIT v tabeli....
  highlightParcelOnMap(parcel: any) {
    if (!this.parcelsVectorSource || !this.highlightSource) {
      console.warn('[Map.Service] highlightParcelOnMap: parcelsVectorSource ali highlightSource ni definiran');
      return;
    }

    // počistimo prejšnje označene stavbe
    this.highlightSource.clear();

    const features = this.parcelsVectorSource.getFeatures();
    const featureToHighlight = features.find(f => f.get('id') === parcel.id);

    console.log('[Map.Service] highlightParcelOnMap featureToHighlight:', featureToHighlight);

    if (!featureToHighlight) {
      console.warn('[Map.Service] highlightParcelOnMap: parcela z id', parcel.id, 'ni bila najdena.');
      return;
    }

    const geometry = featureToHighlight.getGeometry();
    if (!geometry) {
      console.warn('[Map.Service] highlightParcelOnMap: najden feature nima geometrije.');
      return;
    }

    // kloniramo geometrijo in jo dodamo v highlight sloj
    const highlightFeature = featureToHighlight.clone();
    this.highlightSource.addFeature(highlightFeature);

    // zoom na izbrano stavbo
    const extent = geometry.getExtent();
    if (this.map && this.map.getView) {
      this.map.getView().fit(extent, { duration: 600, maxZoom: 7 });
    }
  }




 // Funkcija za označitev stavbe na karti, ko kliknemo gumb EDIT v tabeli....
  highlightBuildingOnMap(building: any) {
    if (!this.buildingsVectorSource || !this.highlightSource) {
      console.warn('[Map.Service] highlightBuildingOnMap: manjkajoči viri slojev.');
      return;
    }

    // počistimo prejšnje označene stavbe
    this.highlightSource.clear();

    const features = this.buildingsVectorSource.getFeatures();
    const featureToHighlight = features.find(f => f.get('id') === building.id);

    console.log('[Map.Service] highlightBuildingOnMap featureToHighlight:', featureToHighlight);

    if (!featureToHighlight) {
      console.warn('[Map.Service] highlightBuildingOnMap: stavba z id', building.id, 'ni bila najdena.');
      return;
    }

    const geometry = featureToHighlight.getGeometry();
    if (!geometry) {
      console.warn('[Map.Service] highlightBuildingOnMap: najden feature nima geometrije.');
      return;
    }

    // kloniramo geometrijo in jo dodamo v highlight sloj
    const highlightFeature = featureToHighlight.clone();
    this.highlightSource.addFeature(highlightFeature);

    // zoom na izbrano stavbo
    const extent = geometry.getExtent();
    if (this.map && this.map.getView) {
      this.map.getView().fit(extent, { duration: 600, maxZoom: 7 });
    }
  } 



  // Funkcija za označitev ceste na karti, ko kliknemo gumb EDIT v tabeli....
  highlightRoadOnMap(road: any) {
    if (!this.roadsVectorSource || !this.highlightSource) {
      console.warn('[Map.Service] highlightRoadOnMap: manjkajoči viri slojev.');
      return;
    }

    // počistimo prejšnje označene stavbe
    this.highlightSource.clear();

    const features = this.roadsVectorSource.getFeatures();
    const featureToHighlight = features.find(f => f.get('id') === road.id);

    console.log('[Map.Service] highlightRoasOnMap featureToHighlight:', featureToHighlight);

    if (!featureToHighlight) {
      console.warn('[Map.Service] highlightRoadOnMap: stavba z id', road.id, 'ni bila najdena.');
      return;
    }

    const geometry = featureToHighlight.getGeometry();
    if (!geometry) {
      console.warn('[Map.Service] highlightRoadOnMap: najden feature nima geometrije.');
      return;
    }

    // kloniramo geometrijo in jo dodamo v highlight sloj
    const highlightFeature = featureToHighlight.clone();
    this.highlightSource.addFeature(highlightFeature);

    // zoom na izbrano stavbo
    const extent = geometry.getExtent();
    if (this.map && this.map.getView) {
      this.map.getView().fit(extent, { duration: 600, maxZoom: 7 });
    }
  } 

  // Funkcija za označitev naslova na karti, ko kliknemo gumb EDIT v tabeli....
  highlightAddressOnMap(address: any) {
    if (!this.addressVectorSource || !this.highlightSource) {
      console.warn('[Map.Service] highlightAddressOnMap: manjkajoči viri slojev.');
      return;
    }

    // počistimo prejšnje označene stavbe
    this.highlightSource.clear();

    const features = this.addressVectorSource.getFeatures();
    const featureToHighlight = features.find(f => f.get('id') === address.id);

    console.log('[Map.Service] highlightAddressOnMap featureToHighlight:', featureToHighlight);

    if (!featureToHighlight) {
      console.warn('[Map.Service] highlightAddressOnMap: stavba z id', address.id, 'ni bila najdena.');
      return;
    }

    const geometry = featureToHighlight.getGeometry();
    if (!geometry) {
      console.warn('[Map.Service] highlightAddressOnMap: najden feature nima geometrije.');
      return;
    }

    // kloniramo geometrijo in jo dodamo v highlight sloj
    const highlightFeature = featureToHighlight.clone();
    this.highlightSource.addFeature(highlightFeature);

    // zoom na izbrano stavbo
    const extent = geometry.getExtent();
    if (this.map && this.map.getView) {
      this.map.getView().fit(extent, { duration: 600, maxZoom: 12 });
    }
  } 


}
