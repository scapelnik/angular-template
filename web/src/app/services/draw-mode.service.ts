// ---------------------------------------------------------------------------------
//  To je servis, ki nam pove na katerem zavihku smo. Od tega je odvisno katere operacije so dovoljene,
// kateri gumbi na karti so omogočeni, ... Je moja verzija Event servisa...
// ---------------------------------------------------------------------------------

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type DrawMode = 'parcel' | 'building' | 'road' | 'address';

@Injectable({providedIn: 'root'})
export class DrawModeService {
  private modeSubject = new BehaviorSubject<DrawMode>('parcel');
  currentMode$ = this.modeSubject.asObservable();

  // Nov Subject za čiščenje obrazcev oz. forme
  private clearFormSubject = new Subject<void>();
  clearForm$ = this.clearFormSubject.asObservable();

  setMode(mode: DrawMode) {
    this.modeSubject.next(mode);
    // Ob vsakem preklopu sporoči tudi, da se naj obrazec počisti
    this.clearFormSubject.next();
  }
}