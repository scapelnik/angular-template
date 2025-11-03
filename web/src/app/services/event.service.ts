// ------------------------------------------------------------------------------------------------------
// To je profesorjev servis.
// Ta Angular servis z imenom EventService deluje kot centralni komunikacijski mehanizem znotraj aplikacije 
// posebej za prenos podatkov o dogodkih med komponentami. Lahko si ga predstavljaš kot 
// dogodkovni oddajnik in poslušalec.
// Subject omogoča tako oddajanje kot poslušanje dogodkov (podatkov)
// -------------------------------------------------------------------------------------------------------


import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { EventModel } from '../models/event.model';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  // Subject to emit events
  private eventSource = new Subject<EventModel>();

  // Observable to listen to events
  public eventActivated$: Observable<EventModel> = this.eventSource.asObservable();

  constructor() { }

  // Method to emit events and pass data to subscribers
  emitEvent(event: EventModel): void {
    this.eventSource.next(event);
  }
}