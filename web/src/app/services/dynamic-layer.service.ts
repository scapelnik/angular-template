import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Style, Stroke, Fill } from 'ol/style';
import { DynamicLayer } from '../models/dynamic-layer';
import { MapService } from './map.service';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class DynamicLayerService {

  private layers: DynamicLayer[] = [];
  layers$ = new BehaviorSubject<DynamicLayer[]>([]);

  private colors = [
    '#e6194b', '#3cb44b', '#4363d8', '#f58231',
    '#911eb4', '#42d4f4', '#f032e6', '#bfef45'
  ];
  private colorIndex = 0;

  constructor(
    private http: HttpClient,
    private mapService: MapService,
    private settingsService: SettingsService
  ) {}

  importFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'geojson' || ext === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const geojson = JSON.parse(e.target?.result as string);
        this.addLayerFromGeoJSON(geojson, file.name);
      };
      reader.readAsText(file);
    } else {
      const formData = new FormData();
      formData.append('file', file);
      this.http.post<any>(
        this.settingsService.API_URL + 'import_layers/convert/',
        formData
      ).subscribe({
        next: (geojson) => this.addLayerFromGeoJSON(geojson, file.name),
        error: (err) => console.error('[DynamicLayerService] Napaka pri konverziji:', err)
      });
    }
  }

  importShapefile(files: FileList): void {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('file', file);
    });
    const shpFile = Array.from(files).find(f => f.name.endsWith('.shp'));
    this.http.post<any>(
      this.settingsService.API_URL + 'import_layers/convert/',
      formData
    ).subscribe({
      next: (geojson) => {
        this.addLayerFromGeoJSON(geojson, shpFile?.name || 'shapefile.shp');
      },
      error: (err) => console.error('[DynamicLayerService] Napaka pri shp:', err)
    });
  }

  private addLayerFromGeoJSON(geojsonData: any, fileName: string): void {
    const color = this.colors[this.colorIndex % this.colors.length];
    this.colorIndex++;

    const source = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonData, {
        dataProjection: 'EPSG:3794',    // vhodni podatki so v D96
        featureProjection: 'EPSG:3794'   // prikaz na karti v slovenskem sistemu D96
      })
    });

    const olLayer = new VectorLayer({
      source: source,
      style: new Style({
        stroke: new Stroke({ color: color, width: 2 }),
        fill: new Fill({ color: color + '22' })
      }),
      properties: { title: fileName },
      zIndex: 5  // pod delovnimi sloji (parcele/stavbe/ceste = 10, highlight = 200)
    });

    this.mapService.map.addLayer(olLayer);

    // Zoom na extent novega sloja, po 3s se vrni na prejšnji pogled
    // const extent = source.getExtent();
    // if (extent && extent[0] !== Infinity) {
    // this.mapService.map.getView().fit(extent, {
    //     padding: [50, 50, 50, 50],
    //     duration: 500
    // });
    // }

    const dynLayer: DynamicLayer = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      title: fileName,
      visible: true,
      olLayer: olLayer
    };

    this.layers.push(dynLayer);
    this.layers$.next([...this.layers]);
    console.log('[DynamicLayerService] Dodan sloj:', fileName);
  }

  removeLayer(id: string): void {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.mapService.map.removeLayer(this.layers[idx].olLayer);
      this.layers.splice(idx, 1);
      this.layers$.next([...this.layers]);
    }
  }

  toggleVisibility(id: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      layer.olLayer.setVisible(layer.visible);
      this.layers$.next([...this.layers]);
    }
  }
}
