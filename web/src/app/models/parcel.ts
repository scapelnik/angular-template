export class Parcel {
  constructor(
    public id: number,
    public parc_st: string,
    public sifko: string,
    public area: number,
    public geom_wkt: string,
    public geom?: string       // ? pomeni da je to polje opcijsko, ni nujno da ga vedno uporabimo
  ) {}
}