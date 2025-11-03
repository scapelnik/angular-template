// ------------------------------------------------------------------------------------------
// Je profesorjev servis,
// Ta Angular ApiService služi kot splošni servis za pošiljanje HTTP zahtevkov (GET in POST) 
// do zunanjega API-ja (do back-enda tvoje aplikacije). Uporablja HttpClient in 
// centralno API_URL vrednost, definirano v SettingsService.
// --------------------------------------------------------------------------------------------

import { Injectable } from '@angular/core';

//To be able to set http requests
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { SettingsService } from './settings.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(public settingsService:SettingsService, private httpClient:HttpClient) { }

  get(endPointUrl:string, getParams:HttpParams=new HttpParams({})){
    return this.httpClient.get<any>(this.settingsService.API_URL + endPointUrl,
      {
        headers: {}, responseType : 'json', reportProgress: false, params: getParams, withCredentials: true
      })
  }


/*
post(endPointUrl: string, postParams: { [key: string]: any } = {}) {
  // Pretvori objekt v URL-encoded string
  let body = new HttpParams();
  for (const key in postParams) {
    if (postParams.hasOwnProperty(key)) {
      body = body.set(key, postParams[key]);
    }
  }

  const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

  return this.httpClient.post<any>(
    this.settingsService.API_URL + endPointUrl,
    body.toString(),  // Obvezno pretvori HttpParams v string
    { headers: headers, responseType: 'json', reportProgress: false, withCredentials: true }
  );
*/


post(endPointUrl: string, postParams: { [key: string]: any } = {}, options: any = {}): Observable<any> {
  let body = new HttpParams();
  for (const key in postParams) {
    if (postParams.hasOwnProperty(key)) {
      body = body.set(key, postParams[key]);
    }
  }

  const defaultOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
    responseType: 'json' as const,
    reportProgress: false,
    withCredentials: true
  };

  const finalOptions = { ...defaultOptions, ...options };

  return this.httpClient.post<any>(
    this.settingsService.API_URL + endPointUrl,
    body.toString(),
    finalOptions
  );
}



}


