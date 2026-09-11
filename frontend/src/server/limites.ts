import { NextResponse } from 'next/server';
import { store } from '@/server/store';

/*
 * Topes de los tres POST públicos (consultas, turnos y "vendé tu auto").
 *
 * Los route handlers del App Router no traen el límite de 1 MB de body que sí
 * tenían las API routes de Pages, y el store es en memoria y del único proceso
 * que da a internet. Sin topes, cualquiera con la URL puede postear cuerpos de
 * varios megas en loop hasta que el contenedor `web` se quede sin memoria: como
 * `restart: unless-stopped` lo vuelve a levantar vacío, eso borra todo lo que el
 * dueño haya cargado. Sin mala intención duele igual: un scraper llena el panel.
 */
export const TOPE_NOMBRE = 120;
export const TOPE_MENSAJE = 2000;
export const TOPE_CONTACTO = 200;

/** Registros por tipo que aguanta el store antes de dejar de aceptar altas. */
export const TOPE_REGISTROS = 500;

/** Devuelve el nombre del primer campo que se pasa de largo, o `null`. */
export function campoDemasiadoLargo(campos: [string, unknown, number][]): string | null {
  for (const [nombre, valor, tope] of campos) {
    if (typeof valor === 'string' && valor.length > tope) return nombre;
  }
  return null;
}

/** 400 con la misma forma `{ error }` que usa el resto de la API. */
export function errorDeLargo(campo: string) {
  return NextResponse.json({ error: `El campo ${campo} es demasiado largo` }, { status: 400 });
}

type Coleccion = 'leads' | 'appointments' | 'sellRequests';

/** `true` si alguna de las colecciones ya llegó al tope. */
export function storeLleno(...colecciones: Coleccion[]): boolean {
  return colecciones.some((c) => store()[c].length >= TOPE_REGISTROS);
}

/** 429 con la misma forma `{ error }` que usa el resto de la API. */
export function errorDeCupo() {
  return NextResponse.json(
    { error: 'Por ahora no podemos recibir más mensajes. Escribinos por WhatsApp o Instagram.' },
    { status: 429 },
  );
}
