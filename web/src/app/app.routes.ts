import { Routes } from '@angular/router';
import { ParcelFormComponent } from './components/forms/parcel-form/parcel-form.component';
import { BuildingFormComponent } from './components/forms/building-form/building-form.component';
import { RoadFormComponent } from './components/forms/road-form/road-form.component';
import { AddressFormComponent } from './components/forms/address-form/address-form.component';
import { ParcelTableComponent } from './components/tables/parcel-table/parcel-table.component';
import { RoadTableComponent } from './components/tables/road-table/road-table.component';
import { AddressTableComponent } from './components/tables/address-table/address-table.component';
import { MapComponent } from './components/map/map.component';
import { LoginFormComponent } from './components/forms/login-form/login-form.component';
import { LogoutFormComponent } from './components/forms/logout-form/logout-form.component';
import { DrawParcelComponent } from './components/draw-parcel/draw-parcel.component';
import { AuthGuard } from './guards/auth.guard'; // pot do guard datoteke (za centralno varovanje)

export const routes: Routes = [
    //{path: '', redirectTo: '/login-form', pathMatch: 'full' },
    {path: 'map', component:MapComponent, canActivate: [AuthGuard] },
    {path: 'form-parcel', component:ParcelFormComponent, canActivate: [AuthGuard] },   // te ki imajo AuthGuard, se ne odpro brez prijave
    {path: 'form-road', component:RoadFormComponent, canActivate: [AuthGuard] },
    {path: 'form-address', component:AddressFormComponent, canActivate: [AuthGuard] },
    {path: 'form-building', component:AddressFormComponent, canActivate: [AuthGuard] },
    {path: 'table-parcel', component:ParcelTableComponent, canActivate: [AuthGuard] },
    {path: 'table-road', component:RoadTableComponent, canActivate: [AuthGuard] },
    {path: 'table-address', component:AddressTableComponent, canActivate: [AuthGuard] },
    {path: 'login-form', component:LoginFormComponent},
    {path: 'logout-form', component:LogoutFormComponent},
    {path: 'draw-parcel', component:DrawParcelComponent, canActivate: [AuthGuard] },  
];
