// ---------------------------------------------------------------------
// TO je servis s katerim komuniciramo med karto in posameznimi formami.
// iz karte prenašamo WKT geometrijo v posamezno formo.
// ---------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Tip geometrije za uporabo v aplikaciji (parcel, road, address, itd.)
 */
export type GeometryType = 'parcel' | 'building' | 'road' | 'address';

export interface WktGeometryPayload {
  type: GeometryType;
  wkt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WktGeometryTransferService {
  private geometrySubject = new Subject<WktGeometryPayload>();

  /**
   * Pošlje novo WKT-geometrijo določene vrste
   * @param type Tip geometrije (npr. 'parcel', 'building', 'road', ...)
   * @param wkt Geometrija v WKT obliki
   */
  sendGeometry(type: GeometryType, wkt: string): void {
    this.geometrySubject.next({ type, wkt });
  }

  /**
   * Vrne opazovalec za spremljanje vseh geometrijskih posodobitev
   */
  getGeometryUpdates(): Observable<WktGeometryPayload> {
    return this.geometrySubject.asObservable();
  }
}