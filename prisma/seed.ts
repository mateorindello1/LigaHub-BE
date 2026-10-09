/**
 * Seed de datos de demostración (pnpm db:seed).
 *
 * BORRA TODOS LOS DATOS de la base y carga siempre el mismo conjunto, para que las pruebas
 * y la defensa partan de un estado conocido. Equivale a HasData / un DbInitializer en EF.
 *
 * Carga:
 * - Un predio con dos canchas.
 * - Ocho equipos.
 * - "Apertura 2026" en curso: seis equipos con siete jugadores cada uno y fixture de cinco fechas
 *   (fechas 1 a 3 jugadas, con un WO y un partido suspendido; fechas 4 y 5 programadas).
 * - "Clausura 2026" con inscripciones abiertas: cuatro equipos inscriptos, sin fixture.
 *
 * Los datos son ficticios. Los emails usan el dominio reservado .test.
 */
import 'dotenv/config';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { EstadoPartido } from '../src/modules/partidos/estado-partido.enum.js';
import { EstadoTorneo } from '../src/modules/torneos/estado-torneo.enum.js';

// #region Datos fijos

const NOMBRES_EQUIPOS = [
  'Los Halcones',
  'Deportivo Sur',
  'Atlético Norte',
  'Unión Barrial',
  'Racing del Parque',
  'Estrella Roja',
  'Club Ribera',
  'Juventud Unida',
];

const NOMBRES = [
  'Juan',
  'Lucas',
  'Martín',
  'Santiago',
  'Tomás',
  'Nicolás',
  'Facundo',
  'Matías',
  'Agustín',
  'Franco',
  'Gonzalo',
  'Ezequiel',
];
const APELLIDOS = [
  'Gómez',
  'Fernández',
  'López',
  'Martínez',
  'Pérez',
  'Romero',
  'Sosa',
  'Díaz',
  'Álvarez',
  'Torres',
  'Ruiz',
  'Benítez',
  'Acosta',
  'Medina',
];

const JUGADORES_POR_EQUIPO = 7;
const DORSALES = [1, 2, 4, 5, 8, 9, 10];
const DORSAL_CAPITAN = 10;

/** Primer sábado del torneo y hora del primer partido de cada fecha. */
const INICIO_APERTURA = new Date('2026-09-05T15:00:00-03:00');
const FECHAS_JUGADAS = 3;

// #endregion

/** Generador pseudoaleatorio con semilla fija: los goles salen iguales en cada ejecución. */
function crearAleatorio(semilla: number): () => number {
  let estado = semilla;
  return () => {
    estado = (estado * 1103515245 + 12345) % 2 ** 31;
    return estado / 2 ** 31;
  };
}

/**
 * Fixture "todos contra todos" con el método del círculo: el primer equipo queda fijo
 * y los demás rotan una posición por fecha. Con n equipos (par) salen n - 1 fechas.
 */
function generarRoundRobin(equipos: number[]): [number, number][][] {
  const rotacion = [...equipos];
  const fechas: [number, number][][] = [];
  for (let fecha = 0; fecha < equipos.length - 1; fecha++) {
    const partidos: [number, number][] = [];
    for (let i = 0; i < equipos.length / 2; i++) {
      const a = rotacion[i];
      const b = rotacion[equipos.length - 1 - i];
      // Alterna la localía entre fechas para que no siempre sea local el mismo.
      partidos.push(fecha % 2 === 0 ? [a, b] : [b, a]);
    }
    fechas.push(partidos);
    rotacion.splice(1, 0, rotacion.pop()!);
  }
  return fechas;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'El seed borra todos los datos: no se ejecuta en producción.',
    );
  }
  const cadenaConexion = process.env.DATABASE_URL;
  if (!cadenaConexion) {
    throw new Error('Falta la variable de entorno DATABASE_URL.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaMssql(cadenaConexion) });
  const aleatorio = crearAleatorio(2026);

  try {
    // #region Limpieza (en orden inverso a las dependencias)
    await prisma.evento.deleteMany();
    await prisma.partidoJugador.deleteMany();
    await prisma.partido.deleteMany();
    await prisma.fechaFixture.deleteMany();
    await prisma.inscripcionJugador.deleteMany();
    await prisma.inscripcionEquipo.deleteMany();
    await prisma.usuarioRol.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.jugador.deleteMany();
    await prisma.equipo.deleteMany();
    await prisma.torneo.deleteMany();
    await prisma.cancha.deleteMany();
    await prisma.predio.deleteMany();

    // Reinicia los IDENTITY para que los ids vuelvan a empezar en 1.
    for (const tabla of [
      'Torneo',
      'Equipo',
      'Jugador',
      'Predio',
      'Cancha',
      'Usuario',
    ]) {
      await prisma.$executeRawUnsafe(`DBCC CHECKIDENT ('${tabla}', RESEED, 0)`);
    }
    // #endregion

    // #region Predio, canchas y equipos
    const predio = await prisma.predio.create({
      data: {
        nombre: 'Complejo Parque Norte',
        direccion: 'Av. Siempreviva 742',
      },
    });
    const canchas = await Promise.all(
      [1, 2].map((numero) =>
        prisma.cancha.create({
          data: {
            predioId: predio.id,
            numero,
            descripcion: `Cancha de fútbol 7 número ${numero}`,
          },
        }),
      ),
    );

    const equipos = [];
    for (const nombre of NOMBRES_EQUIPOS) {
      equipos.push(
        await prisma.equipo.create({ data: { nombre, escudoURL: null } }),
      );
    }
    // #endregion

    // #region Apertura 2026: en curso, con jugadores y fixture
    const apertura = await prisma.torneo.create({
      data: {
        nombre: 'Apertura',
        anio: 2026,
        estadoTorneo: EstadoTorneo.EnCurso,
      },
    });
    const equiposApertura = equipos.slice(0, 6);

    let numeroJugador = 0;
    for (const equipo of equiposApertura) {
      const inscripcion = await prisma.inscripcionEquipo.create({
        data: { torneoId: apertura.id, equipoId: equipo.id },
      });

      for (const dorsal of DORSALES.slice(0, JUGADORES_POR_EQUIPO)) {
        numeroJugador++;
        const nombres = NOMBRES[numeroJugador % NOMBRES.length];
        const apellidos = APELLIDOS[(numeroJugador * 5) % APELLIDOS.length];
        const jugador = await prisma.jugador.create({
          data: {
            dni: String(30_000_000 + numeroJugador),
            nombres,
            apellidos,
            email: `jugador${numeroJugador}@ligahub.test`,
            telefono: `341-555-${String(numeroJugador).padStart(4, '0')}`,
            direccion: 'Rosario, Santa Fe',
          },
        });
        await prisma.inscripcionJugador.create({
          data: {
            inscripcionEquipoId: inscripcion.id,
            jugadorId: jugador.id,
            dorsal,
            capitan: dorsal === DORSAL_CAPITAN,
          },
        });
      }
    }

    const fixture = generarRoundRobin(
      equiposApertura.map((equipo) => equipo.id),
    );
    for (const [indiceFecha, partidosDeLaFecha] of fixture.entries()) {
      const numeroFecha = indiceFecha + 1;
      const fecha = await prisma.fechaFixture.create({
        data: { torneoId: apertura.id, numeroFecha },
      });

      for (const [
        indicePartido,
        [localId, visitanteId],
      ] of partidosDeLaFecha.entries()) {
        // Un sábado por fecha, un partido por hora.
        const fechaHora = new Date(INICIO_APERTURA);
        fechaHora.setDate(fechaHora.getDate() + indiceFecha * 7);
        fechaHora.setHours(fechaHora.getHours() + indicePartido);

        const jugada = numeroFecha <= FECHAS_JUGADAS;
        // En la última fecha jugada: el segundo partido se ganó por WO y el tercero se suspendió.
        const esWO = numeroFecha === FECHAS_JUGADAS && indicePartido === 1;
        const suspendido =
          numeroFecha === FECHAS_JUGADAS && indicePartido === 2;

        let estadoPartido = EstadoPartido.Programado;
        let golesLocal: number | null = null;
        let golesVisitante: number | null = null;
        if (jugada && esWO) {
          estadoPartido = EstadoPartido.WO;
          golesLocal = 3;
          golesVisitante = 0;
        } else if (jugada && suspendido) {
          estadoPartido = EstadoPartido.Suspendido;
        } else if (jugada) {
          estadoPartido = EstadoPartido.Finalizado;
          golesLocal = Math.floor(aleatorio() * 5);
          golesVisitante = Math.floor(aleatorio() * 4);
        }

        await prisma.partido.create({
          data: {
            fechaFixtureId: fecha.id,
            estadoPartido,
            fechaHoraPartido: fechaHora,
            canchaId: canchas[indicePartido % canchas.length].id,
            equipoLocalId: localId,
            equipoVisitanteId: visitanteId,
            cantidadGolesLocal: golesLocal,
            cantidadGolesVisitante: golesVisitante,
          },
        });
      }
    }
    // #endregion

    // #region Clausura 2026: inscripciones abiertas
    const clausura = await prisma.torneo.create({
      data: {
        nombre: 'Clausura',
        anio: 2026,
        estadoTorneo: EstadoTorneo.Inscripcion,
      },
    });
    for (const equipo of equipos.slice(4, 8)) {
      await prisma.inscripcionEquipo.create({
        data: { torneoId: clausura.id, equipoId: equipo.id },
      });
    }
    // #endregion

    console.log(
      `Seed completo: ${equipos.length} equipos, ${numeroJugador} jugadores, ` +
        `torneo ${apertura.id} "Apertura" (en curso, ${fixture.length} fechas) y ` +
        `torneo ${clausura.id} "Clausura" (inscripción).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
