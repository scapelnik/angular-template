export class Road {
  constructor(
    public id: number,
    public str_name: string,
    public administrator: string,
    public maintainer: string,
    public length: number,
    public geom_wkt: string,
    public geom?: string       // ? pomeni da je to polje opcijsko, ni nujno da ga vedno uporabimo
  ) {}
}