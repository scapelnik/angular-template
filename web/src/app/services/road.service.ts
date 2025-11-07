// ---------------------------------------------------------------------
// Servis služi za pridobivanje podatkov iz postgres tabele roads_roads
// ---------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Road } from '../models/roads';  // pot do modela!
import { SettingsService } from './settings.service';

// Interface za podatke, ki jih pošiljamo ob save/update
export interface RoadPayload {
  str_name: string;
  administrator: string;
  maintainer: string;
  length: number;
  geom: string;
}

@Injectable({ providedIn: 'root' })
export class RoadService {
  private baseUrl = this.settingsService.API_URL+'roads/roads/';
  private insertUrl= this.settingsService.API_URL+'roads/roads_view/insert2/';

  constructor(public settingsService:SettingsService,  private http: HttpClient) {}

  /** Pridobi vse ceste */
  getAll(): Observable<Road[]> {                                         // metoda za pridobivanje vseh cest
    console.log('RoadService: getAll() called');
    return this.http.get<Road[]>(this.baseUrl).pipe(
      tap(roads => console.log('RoadService: received roads:', roads))
    );
  }

    getOne(id: number): Observable<Road> {                             // metoda za pridobivanje ene ceste
       const url = this.settingsService.API_URL+'roads/roads/${id}/';
       console.log(`RoadService: pridobivam cesto z ID=${id}`);
       return this.http.get<Road>(url).pipe(
         tap(road => console.log('Prejeta posamezna cesta:', road))
      );
    }

  /** Shrani novo cesto */
  save(road: RoadPayload): Observable<any> {
    console.log('RoadService: save() called with:', road);

    const body = new HttpParams()
      .set('str_name', road.str_name)
      .set('administrator', road.administrator)
      .set('maintainer', road.maintainer)
      .set('geom', road.geom)
      .set('length', road.length.toString());

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post(this.insertUrl, body.toString(), { headers }).pipe(
      tap(response => console.log('RoadService: save response:', response))
    );
  }

  /** Posodobi obstoječo cesto */
  update(id: number, road: RoadPayload): Observable<any> {
    console.log(`RoadService: update() called for id=${id} with:`, road);

    return this.http.put(`${this.baseUrl}${id}/`, road).pipe(
      tap(response => console.log('RoadService: update response:', response))
    );
  }

  /** Izbriši cesto */
  delete(id: number): Observable<any> {
    console.log(`RoadService: delete() called for id=${id}/`);

    return this.http.delete(`${this.baseUrl}${id}/`).pipe(
      tap(response => console.log('RoadService: delete response:', response))
    );
  }
}