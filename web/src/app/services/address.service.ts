// --------------------------------------------------------------------------------------
// Je servis za pridobivanje podatkov o naslovih iz postgres tabele addresses-addresses
// --------------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Address } from '../models/address';  // prilagodi pot do modela
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private baseUrl = this.settingsService.API_URL+'addresses/addresses/';                      //  API_URL='localhost:8000/' ali kaj drugega


  constructor(public settingsService:SettingsService, private http: HttpClient) {}

  /** Pridobi vse naslove - addresses */
  getAll(): Observable<Address[]> {
    console.log('AddressService: pridobivam vse naslove');
    return this.http.get<Address[]>(this.baseUrl).pipe(
      tap(address  => console.log('Prejeti naslovi:', address))
    );
  }

  getOne(id: number): Observable<Address> {
    const url = this.settingsService.API_URL+'addresses/addresses/${id}/';           // API_URL='localhost:8000/' ali kaj drugega
    console.log(`AddressService: pridobivam naslov z ID=${id}`);
    return this.http.get<Address>(url).pipe(
      tap(address => console.log('Prejeta posamezen naslov:', address))
      );
    }

  /** Shrani nov naslov */
  save(address: {
    building_num: number;
    street: string;
    house_num: string;
    post_num: number;
    post_name: string;
    geom: string;
  }): Observable<any> {
    console.log('AddressService: shranjujem naslove:', address);

    const body = new HttpParams()
      .set('building_num', address.building_num)
      .set('street', address.street)
      .set('house_num', address.house_num)
      .set('post_num', address.post_num) 
      .set('post_name', address.post_name)
      .set('geom', address.geom);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post(this.baseUrl, body.toString(), { headers }).pipe(
      tap(res => console.log('Odgovor po shranjevanju naslova:', res))
    );
  }

  /** Posodobi obstoječ naslov */
  update(id: number, address: {
    building_num: number;
    street: string;
    house_num: string;
    post_num: number;
    post_name: string;
    geom: string;
  }): Observable<any> {
    console.log(`AddressService: posodabljam naslov z ID=${id}/`, address);
    return this.http.put(`${this.baseUrl}${id}/`, address).pipe(
      tap(res => console.log('Odgovor po posodobitvi naslova:', res))
    );
  }

  /** Izbriši naslov */
  delete(id: number): Observable<any> {
    console.log(`AddressService: brišem naslov z ID=${id}/`);
    return this.http.delete(`${this.baseUrl}${id}/`);
  }
}