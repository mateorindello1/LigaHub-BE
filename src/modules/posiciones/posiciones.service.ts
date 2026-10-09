import { Injectable, NotFoundException } from '@nestjs/common';
import { ESTADOS_CON_RESULTADO } from '../partidos/estado-partido.enum.js';
import { TorneosService } from '../torneos/torneos.service.js';
import {
  calcularPosiciones,
  type FilaPosiciones,
} from './calcular-posiciones.js';
import type {
  DetalleEquipo,
  PartidoDetalle,
  ResultadoPartido,
} from './detalle-equipo.js';
import {
  PosicionesRepository,
  type PartidoDelEquipo,
} from './posiciones.repository.js';

/** Tabla de posiciones de un torneo y detalle de un equipo dentro del torneo. */
@Injectable()
export class PosicionesService {
  constructor(
    private readonly posicionesRepository: PosicionesRepository,
    private readonly torneosService: TorneosService,
  ) {}

  /** Tabla de posiciones del torneo. Si el torneo no existe, responde 404. */
  async obtenerPosiciones(torneoId: number): Promise<FilaPosiciones[]> {
    await this.torneosService.obtenerPorId(torneoId);
    return this.calcularTabla(torneoId);
  }

  /**
   * Detalle del equipo en el torneo: sus datos, su línea de la tabla, sus partidos y sus jugadores.
   * Responde 404 si el torneo no existe o si el equipo no está inscripto en él.
   */
  async obtenerDetalleEquipo(
    torneoId: number,
    equipoId: number,
  ): Promise<DetalleEquipo> {
    const torneo = await this.torneosService.obtenerPorId(torneoId);

    const inscripcion =
      await this.posicionesRepository.obtenerInscripcionConJugadores(
        torneoId,
        equipoId,
      );
    if (!inscripcion) {
      throw new NotFoundException(
        `El equipo ${equipoId} no está inscripto en el torneo "${torneo.nombre}".`,
      );
    }

    // La tabla y los partidos son independientes: se consultan en paralelo (como Task.WhenAll).
    const [tabla, partidos] = await Promise.all([
      this.calcularTabla(torneoId),
      this.posicionesRepository.obtenerPartidosDelEquipo(torneoId, equipoId),
    ]);

    // El equipo está inscripto, así que siempre tiene su línea en la tabla.
    const { equipo, ...posicion } = tabla.find(
      (fila) => fila.equipo.id === equipoId,
    )!;

    return {
      torneo: {
        id: torneo.id,
        nombre: torneo.nombre,
        anio: torneo.anio,
        estadoTorneo: torneo.estadoTorneo,
      },
      equipo,
      inscripcionId: inscripcion.id,
      posicion,
      partidos: partidos.map((partido) =>
        this.armarPartidoDetalle(partido, equipoId),
      ),
      jugadores: inscripcion.jugadores.map((inscripto) => ({
        id: inscripto.id,
        jugadorId: inscripto.jugador.id,
        nombres: inscripto.jugador.nombres,
        apellidos: inscripto.jugador.apellidos,
        dorsal: inscripto.dorsal,
        capitan: inscripto.capitan,
      })),
    };
  }

  /** Consulta los equipos y los partidos con resultado, y calcula la tabla. */
  private async calcularTabla(torneoId: number): Promise<FilaPosiciones[]> {
    const [equipos, partidos] = await Promise.all([
      this.posicionesRepository.obtenerEquiposInscriptos(torneoId),
      this.posicionesRepository.obtenerPartidosConResultado(torneoId),
    ]);
    return calcularPosiciones(equipos, partidos);
  }

  /** Convierte un partido al formato del detalle, visto desde el equipo. */
  private armarPartidoDetalle(
    partido: PartidoDelEquipo,
    equipoId: number,
  ): PartidoDetalle {
    const esLocal = partido.equipoLocalId === equipoId;
    const golesAFavor = esLocal
      ? partido.cantidadGolesLocal
      : partido.cantidadGolesVisitante;
    const golesEnContra = esLocal
      ? partido.cantidadGolesVisitante
      : partido.cantidadGolesLocal;

    const tieneResultado =
      (ESTADOS_CON_RESULTADO as readonly number[]).includes(
        partido.estadoPartido,
      ) &&
      golesAFavor !== null &&
      golesEnContra !== null;

    return {
      id: partido.id,
      numeroFecha: partido.fechaFixture.numeroFecha,
      fechaHora: partido.fechaHoraPartido,
      estadoPartido: partido.estadoPartido,
      condicion: esLocal ? 'Local' : 'Visitante',
      rival: esLocal ? partido.equipoVisitante : partido.equipoLocal,
      golesAFavor,
      golesEnContra,
      resultado: tieneResultado
        ? this.resultado(golesAFavor, golesEnContra)
        : null,
      cancha: partido.cancha
        ? {
            numero: partido.cancha.numero,
            predio: partido.cancha.predio.nombre,
          }
        : null,
    };
  }

  private resultado(
    golesAFavor: number,
    golesEnContra: number,
  ): ResultadoPartido {
    if (golesAFavor > golesEnContra) return 'Ganado';
    if (golesAFavor < golesEnContra) return 'Perdido';
    return 'Empatado';
  }
}
