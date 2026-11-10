import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { EstadoPartido } from '../estado-partido.enum.js';
import { TipoEvento, VALORES_TIPO_EVENTO } from '../tipo-evento.enum.js';

/** Estados que se pueden cargar como resultado. */
export const ESTADOS_RESULTADO = [
  EstadoPartido.Finalizado,
  EstadoPartido.WO,
  EstadoPartido.Suspendido,
];

/** Último minuto que se acepta (90 más alargue y adicionales). */
export const MINUTO_MAXIMO = 130;

const MENSAJE_MINUTO = `El minuto tiene que ser un entero entre 0 y ${MINUTO_MAXIMO}.`;

/** Un evento del partido. Los jugadores se identifican por su inscripción en el equipo. */
export class EventoDto {
  @IsIn(VALORES_TIPO_EVENTO, {
    message:
      'El tipo de evento tiene que ser 1 (gol), 2 (gol en contra), 3 (amonestación), 4 (expulsión) o 5 (cambio).',
  })
  tipoEvento: TipoEvento;

  @Max(MINUTO_MAXIMO, { message: MENSAJE_MINUTO })
  @Min(0, { message: MENSAJE_MINUTO })
  @IsInt({ message: MENSAJE_MINUTO })
  minuto: number;

  /** Jugador del evento (en un cambio, el que sale). */
  @IsUUID('all', { message: 'El jugador del evento no es un id válido.' })
  inscripcionJugadorId: string;

  /** Solo en un cambio: el jugador que entra. */
  @IsUUID('all', { message: 'El jugador que entra no es un id válido.' })
  @IsOptional()
  inscripcionJugadorEntraId?: string | null;
}

/**
 * Resultado de un partido (cuerpo de PUT /partidos/:id/resultado). Reemplaza lo que hubiera.
 * - Finalizado (2): jugadores que participaron y eventos. El marcador se calcula de los goles.
 * - WO (3): equipo que se presentó (ganador). Sin jugadores ni eventos.
 * - Suspendido (4): sin jugadores, eventos ni marcador.
 */
export class CargarResultadoDto {
  @IsIn(ESTADOS_RESULTADO, {
    message:
      'El estado tiene que ser 2 (finalizado), 3 (W.O.) o 4 (suspendido).',
  })
  estadoPartido: EstadoPartido;

  /** Inscripciones de los jugadores que participaron, de los dos equipos. */
  @ArrayUnique({ message: 'Un jugador no puede figurar dos veces.' })
  @IsUUID('all', {
    each: true,
    message: 'Cada jugador tiene que ser un id válido.',
  })
  @IsArray({ message: 'Los jugadores tienen que ser una lista.' })
  @IsOptional()
  jugadores?: string[];

  @ValidateNested({ each: true })
  @Type(() => EventoDto)
  @IsArray({ message: 'Los eventos tienen que ser una lista.' })
  @IsOptional()
  eventos?: EventoDto[];

  /** Solo con W.O.: el equipo que se presentó y gana el partido. */
  @Min(1, { message: 'El id del equipo ganador debe ser mayor a 0.' })
  @IsInt({ message: 'El id del equipo ganador debe ser un número entero.' })
  @IsOptional()
  equipoGanadorId?: number;
}
