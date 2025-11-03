
export class Building {
    constructor(
      public id: string,
      public sifko: number,
      public st_stavbe: number,
      public description: string, 
      public area: number,
      public geom_wkt: string,
      public geom?:string
    ){}
  }