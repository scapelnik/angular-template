// ---------------------------------------------------------------------
// Servis služi za pridobivanje podatkov iz postgres tabele building_building
// ---------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Building} from '../models/building';  

@Injectable({ providedIn: 'root' })
export class BuildingService {
  private baseUrl   = 'http://10.32.52.147:8000/buildings/buildings/';
  private insertUrl = 'http://10.32.52.147:8000/building/building_view/insert2/';  
  private updateUrl = 'http://10.32.52.147:8000/building/building_view/update/';  

  constructor(private http: HttpClient) {}

  /** Pridobi vse stavbe */
  getAll(): Observable<Building[]> {
    console.log('BuildingService: pridobivam vse stavbe');
    return this.http.get<Building[]>(this.baseUrl).pipe(
      tap(buildings => console.log('Prejete stavbe:', buildings))
    );
  }

  getOne(id: number): Observable<Building> {
     const url = `http://localhost:8000/buildings/buildings/${id}/`;
     console.log(`BuildingService: pridobivam stavbo z ID=${id}`);
     return this.http.get<Building>(url).pipe(
       tap(building => console.log('Prejeta posamezna stavba:', building))
    );
  }

  /** Shrani novo stavbo */
  save(building: {
    id: string;
    description: string;
    sifko: number;
    st_stavbe: number;
    area: number;
    geom: string;
  }): Observable<any> {
    console.log('BuildingService: shranjujem stavbo:', building);

    const body = new HttpParams()
      .set('id', building.id)
      .set('description', building.description)
      .set('sifko', building.sifko)
      .set('st_stavbe', building.st_stavbe)
      .set('area', building.area.toString())
      .set('geom', building.geom);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post(this.insertUrl, body.toString(), { headers }).pipe(
      tap(res => console.log('Odgovor po shranjevanju stavbe:', res))
    );
  }



  /** Posodobi obstoječo stavbo */
  update(id: string, building: {
    id: string;
    description: String;
    sifko: number;
    st_stavbe: number;
    area: number;
    geom: string;
  }): Observable<any> {
    console.log(`BuildingService: posodabljam stavbo z ID=${id}/`, building);
    return this.http.post(`${this.updateUrl}${id}/`, building).pipe(
      tap(res => console.log('Odgovor po posodobitvi stavbe:', res))
    );
  }


  /** Izbriši stavbo */
  delete(id: number): Observable<any> {
    console.log(`BuildingService: brišem stavbo z ID=${id}/`);
    return this.http.delete(`${this.baseUrl}${id}/`);
    // return this.http.delete(`${this.baseUrl}${id}/`, { withCredentials: true });
  }

}