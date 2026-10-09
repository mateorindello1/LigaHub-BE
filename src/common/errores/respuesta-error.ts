/** Error de validación de un campo del pedido. */
export interface DetalleError {
  /** Nombre del campo, con su ruta si está anidado (por ejemplo, "jugador.dni"). */
  campo: string;
  mensajes: string[];
}

/**
 * Formato único de todas las respuestas de error de la API.
 * Lo arma el filtro global de excepciones.
 */
export interface RespuestaError {
  /** Código de estado HTTP. */
  estado: number;
  /** Nombre del error ("Solicitud inválida", "No encontrado"...). */
  error: string;
  /** Explicación para mostrar al usuario. */
  mensaje: string;
  /** Errores por campo. Solo en los errores de validación. */
  detalles?: DetalleError[];
  /** Ruta del pedido que falló. */
  ruta: string;
  /** Fecha y hora del error, en formato ISO. */
  fecha: string;
}
