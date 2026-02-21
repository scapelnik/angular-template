import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicLayerService } from '../../services/dynamic-layer.service';
import { DynamicLayer } from '../../models/dynamic-layer';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-layer-import',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltip],
  templateUrl: './layer-import.component.html',
  styleUrl: './layer-import.component.scss'
})
export class LayerImportComponent implements OnInit {
  layers: DynamicLayer[] = [];
  panelOpen = false;

  constructor(
    private dynLayerService: DynamicLayerService,
    private cdRef: ChangeDetectorRef
  ) {}

ngOnInit(): void {
    this.dynLayerService.layers$.subscribe(layers => {
      console.log('[LayerImport] Prejel sloje:', layers.length);  // za debug
      this.layers = [...layers];
      if (layers.length > 0) {
        this.panelOpen = true;
      }
      this.cdRef.detectChanges();  // DODAJ - prisili Angular da zazna spremembo
    });
}

openFilePicker(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.gpkg,.geojson,.json,.kml,.shp,.dbf,.prj,.shx';
  input.multiple = true;  // ‹ TO OMOGOÈI VEÈKRATNO IZBIRO torej za shape lahko izberemo vse 4 zbirke (ali celo veè)
  input.onchange = (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0) return;

    const shpFile = Array.from(files).find(f => f.name.endsWith('.shp'));
    if (shpFile) {
      this.dynLayerService.importShapefile(files);
    } else {
      this.dynLayerService.importFile(files[0]);
    }
    this.panelOpen = true;
  };
  input.click();
}

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  toggleVisibility(id: string): void {
    this.dynLayerService.toggleVisibility(id);
  }

  removeLayer(id: string): void {
    this.dynLayerService.removeLayer(id);
  }
}