export class ServerAnswerModel {
    message: string='';
    ok: boolean = false;
    data: {
      [key: string]: any; // Permite otras propiedades dinámicas si las hay
    }[]=[];
  }