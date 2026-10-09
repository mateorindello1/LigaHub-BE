import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTorneo } from '../torneos/estado-torneo.enum.js';
import { TorneosService } from '../torneos/torneos.service.js';
import { GenerarFixtureDto } from './dto/generar-fixture.dto.js';
import {
  FixtureRepository,
  type FechaConPartidos,
} from './fixture.repository.js';
import type { FechaFixtureVista } from './fixture-vista.js';
import { generarFixture } from './generar-fixture.js';

/**
 * Caso de uso: generar el fixture de un torneo a partir de los equipos inscriptos.
 * Al generarlo, el torneo pasa a EnCurso y se cierran las inscripciones.
 */
@Injectable()
export class FixtureService {
  constructor(
    private readonly fixtureRepository: FixtureRepository,
    private readonly torneosService: TorneosService,
  ) {}

  /** Devuelve el fixture del torneo. Si todavía no se generó, devuelve una lista vacía. */
  async obtener(torneoId: number): Promise<FechaFixtureVista[]> {
    await this.torneosService.obtenerPorId(torneoId);
    return this.armarVista(torneoId);
  }

  /** Genera el fixture "todos contra todos", lo guarda y pasa el torneo a EnCurso. */
  async generar(
    torneoId: number,
    dto: GenerarFixtureDto,
  ): Promise<FechaFixtureVista[]> {
    // #region Validaciones
    const torneo = await this.torneosService.obtenerPorId(torneoId);

    if (torneo.estadoTorneo !== (EstadoTorneo.Inscripcion as number)) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" ya no está en inscripción: el fixture ya fue generado.`,
      );
    }
    // Protección extra por si quedaron fechas sin que el torneo haya cambiado de estado.
    if (await this.fixtureRepository.tieneFixture(torneoId)) {
      throw new ConflictException(
        `El torneo "${torneo.nombre}" ya tiene fixture.`,
      );
    }

    const equipos =
      await this.fixtureRepository.obtenerEquiposInscriptos(torneoId);
    if (equipos.length < 2) {
      throw new ConflictException(
        `Se necesitan al menos dos equipos inscriptos para generar el fixture (hay ${equipos.length}).`,
      );
    }
    // #endregion

    // Mezcla los equipos para que el cruce de cada fecha no dependa del orden de inscripción.
    const fechas = generarFixture(
      mezclar(equipos.map((equipo) => equipo.id)),
      dto.idaYVuelta ?? false,
    );

    await this.fixtureRepository.guardarFixture(
      torneoId,
      fechas,
      dto.fechaInicio ? new Date(dto.fechaInicio) : null,
    );

    return this.armarVista(torneoId);
  }

  /**
   * Deshace el fixture y vuelve el torneo a Inscripcion. Solo se permite si todavía no se jugó
   * ni se suspendió ningún partido. Sirve para corregir el fixture antes de empezar el torneo.
   */
  async deshacer(torneoId: number): Promise<void> {
    const torneo = await this.torneosService.obtenerPorId(torneoId);

    if (!(await this.fixtureRepository.tieneFixture(torneoId))) {
      throw new NotFoundException(
        `El torneo "${torneo.nombre}" no tiene fixture.`,
      );
    }
    if (await this.fixtureRepository.tienePartidosConActividad(torneoId)) {
      throw new ConflictException(
        'No se puede deshacer el fixture: ya hay partidos jugados, suspendidos o con jugadores cargados.',
      );
    }

    await this.fixtureRepository.borrarFixture(torneoId);
  }

  /** Consulta las fechas y les agrega el equipo libre de cada una. */
  private async armarVista(torneoId: number): Promise<FechaFixtureVista[]> {
    const [fechas, equipos] = await Promise.all([
      this.fixtureRepository.obtenerFechas(torneoId),
      this.fixtureRepository.obtenerEquiposInscriptos(torneoId),
    ]);
    return fechas.map((fecha) => this.armarFecha(fecha, equipos));
  }

  private armarFecha(
    fecha: FechaConPartidos,
    equipos: { id: number; nombre: string }[],
  ): FechaFixtureVista {
    // El libre es el inscripto que no aparece en ningún partido de la fecha.
    const queJuegan = new Set(
      fecha.partidos.flatMap((p) => [p.equipoLocal.id, p.equipoVisitante.id]),
    );
    const libres = equipos.filter((equipo) => !queJuegan.has(equipo.id));

    return {
      id: fecha.id,
      numeroFecha: fecha.numeroFecha,
      partidos: fecha.partidos.map((partido) => ({
        id: partido.id,
        estadoPartido: partido.estadoPartido,
        fechaHora: partido.fechaHoraPartido,
        local: partido.equipoLocal,
        visitante: partido.equipoVisitante,
        golesLocal: partido.cantidadGolesLocal,
        golesVisitante: partido.cantidadGolesVisitante,
        cancha: partido.cancha
          ? {
              numero: partido.cancha.numero,
              predio: partido.cancha.predio.nombre,
            }
          : null,
      })),
      equipoLibre: libres.length === 1 ? libres[0] : null,
    };
  }
}

/** Devuelve una copia del arreglo en orden aleatorio (algoritmo de Fisher-Yates). */
function mezclar<T>(elementos: T[]): T[] {
  const copia = [...elementos];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
