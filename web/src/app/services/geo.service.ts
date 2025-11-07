// ------------------------------------------------------------------------------------------------------
// To je servis v katerem imam realiziran izvoz podatkov v en Geopackage GPKG.
// -------------------------------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class GeoService {

  private baseUrl = this.settingsService.API_URL+'export/gpkg/'; // link za naš service za prenos geopackage

  constructor(public settingsService:SettingsService, private http: HttpClient) {}

  downloadGeoPackage(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}`, {
      responseType: 'blob'
    });
  }
}