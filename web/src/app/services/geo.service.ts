// ------------------------------------------------------------------------------------------------------
// To je servis v katerem imam realiziran izvoz podatkov v en Geopackage GPKG.
// -------------------------------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeoService {

  private baseUrl = 'http://10.32.52.147:8000/export/gpkg/'; // link za naš service za prenos geopackage

  constructor(private http: HttpClient) {}

  downloadGeoPackage(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}`, {
      responseType: 'blob'
    });
  }
}