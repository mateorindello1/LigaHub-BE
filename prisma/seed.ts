/**
 * Seed de datos de demostración (pnpm db:seed).
 *
 * BORRA TODOS LOS DATOS de la base y carga siempre el mismo conjunto, para que las pruebas
 * y la defensa partan de un estado conocido. Equivale a HasData / un DbInitializer en EF.
 *
 * Carga:
 * - Un predio con dos canchas.
 * - Ocho equipos.
 * - "Apertura 2026" en curso: seis equipos con nueve jugadores cada uno (siete titulares y dos
 *   suplentes) y fixture de cinco fechas: fechas 1 a 3 jugadas, con un WO y un partido
 *   suspendido; fechas 4 y 5 programadas.
 * - Planilla de cada partido jugado, coherente con el marcador: quiénes jugaron, goles (alguno
 *   en contra), amonestaciones, alguna expulsión y cambios. Ver generarPlanilla.
 * - "Clausura 2026" con inscripciones abiertas: cuatro equipos inscriptos, sin fixture.
 * - Un usuario por rol (administrador, asistente y jugador), con la contraseña de SEED_CONTRASENIA.
 *   El usuario jugador está asociado al capitán del primer equipo.
 *
 * Los datos son ficticios. Los emails usan el dominio reservado .test.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { generarFixture } from '../src/modules/fixture/generar-fixture.js';
import { EstadoPartido } from '../src/modules/partidos/estado-partido.enum.js';
import { TipoEvento } from '../src/modules/partidos/tipo-evento.enum.js';
import { EstadoTorneo } from '../src/modules/torneos/estado-torneo.enum.js';
import { Rol } from '../src/common/seguridad/rol.enum.js';
import { ContraseniasService } from '../src/modules/usuarios/contrasenias.service.js';
import { AlmacenamientoService } from '../src/modules/almacenamiento/almacenamiento.service.js';
import { leerConfiguracion } from '../src/config/configuracion.js';

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

/** Fútbol 7: los siete primeros dorsales son los titulares y los dos últimos, suplentes. */
const DORSALES = [1, 2, 4, 5, 8, 9, 10, 11, 14];
const TITULARES = 7;
const DORSAL_ARQUERO = 1;
const DORSAL_CAPITAN = 10;

/** Primer sábado del torneo y hora del primer partido de cada fecha. */
const INICIO_APERTURA = new Date('2026-09-19T15:00:00-03:00');
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

// #region Planilla de los partidos jugados

/** Jugador inscripto en un equipo del torneo. */
interface Inscripto {
  inscripcionJugadorId: string;
  dorsal: number;
}

type Lado = 'local' | 'visitante';

/** Evento ya asignado a jugadores, listo para guardar. */
interface EventoGenerado {
  tipoEvento: TipoEvento;
  minuto: number;
  inscripcionJugadorId: string;
  inscripcionJugadorEntraId: string | null;
}

/** Planilla de un partido jugado: quiénes jugaron y los eventos. */
interface Planilla {
  jugaron: string[];
  eventos: EventoGenerado[];
}

/**
 * Genera una planilla coherente con el marcador:
 * - Juegan los siete titulares de cada equipo y los suplentes que entran en un cambio.
 * - Los goles suman exactamente el marcador; alrededor del 15 % es un gol en
 *   contra de un jugador del equipo rival.
 * - Uno o dos cambios por equipo en el segundo tiempo, de 0 a 3 amonestaciones y, a veces,
 *   una expulsión.
 *
 * Los eventos se arman primero con su minuto y su equipo, y después se recorren en orden
 * cronológico asignando jugadores que estén en cancha en ese momento: nadie hace un gol
 * después de salir o de ser expulsado, ni antes de entrar, y nadie recibe dos amarillas.
 * Los goles no los hace el arquero.
 */
function generarPlanilla(
  planteles: Record<Lado, Inscripto[]>,
  golesLocal: number,
  golesVisitante: number,
  aleatorio: () => number,
): Planilla {
  const entero = (desde: number, hasta: number) =>
    desde + Math.floor(aleatorio() * (hasta - desde + 1));
  const elegir = <T>(opciones: T[]): T =>
    opciones[Math.floor(aleatorio() * opciones.length)];
  const rival = (lado: Lado): Lado =>
    lado === 'local' ? 'visitante' : 'local';

  // #region Eventos sin jugador: tipo, minuto y equipo del protagonista
  const borradores: { tipoEvento: TipoEvento; minuto: number; lado: Lado }[] =
    [];
  for (const [lado, goles] of [
    ['local', golesLocal],
    ['visitante', golesVisitante],
  ] as const) {
    for (let i = 0; i < goles; i++) {
      const enContra = aleatorio() < 0.15;
      borradores.push({
        tipoEvento: enContra ? TipoEvento.GolEnContra : TipoEvento.Gol,
        minuto: entero(1, 90),
        // Un gol en contra lo hace un jugador del rival y suma para este equipo.
        lado: enContra ? rival(lado) : lado,
      });
    }
    for (let i = 0, cambios = entero(1, 2); i < cambios; i++) {
      borradores.push({
        tipoEvento: TipoEvento.Cambio,
        minuto: entero(46, 85),
        lado,
      });
    }
  }
  for (let i = 0, amonestaciones = entero(0, 3); i < amonestaciones; i++) {
    borradores.push({
      tipoEvento: TipoEvento.Amonestacion,
      minuto: entero(5, 90),
      lado: elegir<Lado>(['local', 'visitante']),
    });
  }
  if (aleatorio() < 0.2) {
    borradores.push({
      tipoEvento: TipoEvento.Expulsion,
      minuto: entero(50, 88),
      lado: elegir<Lado>(['local', 'visitante']),
    });
  }
  borradores.sort((a, b) => a.minuto - b.minuto);
  // #endregion

  // #region Asignación de jugadores en orden cronológico
  const enCancha: Record<Lado, Inscripto[]> = {
    local: planteles.local.slice(0, TITULARES),
    visitante: planteles.visitante.slice(0, TITULARES),
  };
  const suplentes: Record<Lado, Inscripto[]> = {
    local: planteles.local.slice(TITULARES),
    visitante: planteles.visitante.slice(TITULARES),
  };
  const jugaron = [...enCancha.local, ...enCancha.visitante].map(
    (j) => j.inscripcionJugadorId,
  );
  const amonestados = new Set<string>();
  const eventos: EventoGenerado[] = [];

  for (const { tipoEvento, minuto, lado } of borradores) {
    const enJuego = enCancha[lado];
    const campo = enJuego.filter((j) => j.dorsal !== DORSAL_ARQUERO);
    let protagonista: Inscripto | undefined;
    let entra: Inscripto | undefined;

    if (tipoEvento === TipoEvento.Cambio) {
      entra = suplentes[lado].shift();
      if (!entra || campo.length === 0) continue;
      protagonista = elegir(campo);
      enCancha[lado] = [...enJuego.filter((j) => j !== protagonista), entra];
      jugaron.push(entra.inscripcionJugadorId);
    } else if (tipoEvento === TipoEvento.Amonestacion) {
      const sinAmarilla = enJuego.filter(
        (j) => !amonestados.has(j.inscripcionJugadorId),
      );
      if (sinAmarilla.length === 0) continue;
      protagonista = elegir(sinAmarilla);
      amonestados.add(protagonista.inscripcionJugadorId);
    } else if (tipoEvento === TipoEvento.Expulsion) {
      protagonista = elegir(campo.length > 0 ? campo : enJuego);
      enCancha[lado] = enJuego.filter((j) => j !== protagonista);
    } else {
      // Gol o gol en contra: un jugador de campo (si quedara solo el arquero, él).
      protagonista = elegir(campo.length > 0 ? campo : enJuego);
    }

    eventos.push({
      tipoEvento,
      minuto,
      inscripcionJugadorId: protagonista.inscripcionJugadorId,
      inscripcionJugadorEntraId: entra?.inscripcionJugadorId ?? null,
    });
  }
  // #endregion

  return { jugaron, eventos };
}

// #endregion

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
  // Contraseña de los usuarios de prueba: se lee del .env para que no quede en el repositorio.
  const contraseniaPrueba = process.env.SEED_CONTRASENIA?.trim();
  if (!contraseniaPrueba || contraseniaPrueba.length < 12) {
    throw new Error(
      'Falta SEED_CONTRASENIA en .env (contraseña de los usuarios de prueba, de al menos 12 caracteres).',
    );
  }

  const prisma = new PrismaClient({ adapter: new PrismaMssql(cadenaConexion) });
  const aleatorio = crearAleatorio(2026);

  try {
    // #region Limpieza (en orden inverso a las dependencias)
    // Fotos de perfil: se borran del almacenamiento antes que los usuarios, para no dejar
    // archivos huérfanos. Si el almacenamiento no responde, se sigue igual.
    const conFoto = await prisma.usuario.findMany({
      where: { fotoPerfil: { not: null } },
      select: { fotoPerfil: true },
    });
    if (conFoto.length > 0) {
      const { almacenamiento } = leerConfiguracion();
      const archivos = new AlmacenamientoService(almacenamiento);
      for (const { fotoPerfil } of conFoto) {
        await archivos
          .borrar(almacenamiento.contenedorFotos, fotoPerfil!)
          .catch(() =>
            console.warn(
              `No se pudo borrar la foto ${fotoPerfil} del almacenamiento.`,
            ),
          );
      }
    }

    await prisma.evento.deleteMany();
    await prisma.partidoJugador.deleteMany();
    await prisma.partido.deleteMany();
    await prisma.fechaFixture.deleteMany();
    await prisma.inscripcionJugador.deleteMany();
    await prisma.inscripcionEquipo.deleteMany();
    await prisma.usuarioRol.deleteMany();
    await prisma.tokenRefresco.deleteMany();
    await prisma.usuario.deleteMany();
    await prisma.jugador.deleteMany();
    await prisma.equipo.deleteMany();
    await prisma.torneo.deleteMany();
    await prisma.cancha.deleteMany();
    await prisma.predio.deleteMany();

    // Reinicia los IDENTITY para que los ids vuelvan a empezar en 1.
    // Regla de SQL Server: si la tabla NUNCA tuvo filas, el primer id es el valor del RESEED;
    // si ya tuvo filas, es el valor del RESEED + 1. Que nunca tuvo filas se sabe porque
    // sys.identity_columns.last_value sigue en NULL (aunque se le haya hecho un RESEED antes):
    // - last_value NULL: RESEED 1, el primer id es 1.
    // - last_value con valor: RESEED 0, el próximo id es 1.
    for (const tabla of [
      'Torneo',
      'Equipo',
      'Jugador',
      'Predio',
      'Cancha',
      'Usuario',
    ]) {
      await prisma.$executeRawUnsafe(
        `IF (SELECT last_value FROM sys.identity_columns
             WHERE object_id = OBJECT_ID('${tabla}')) IS NULL
           DBCC CHECKIDENT ('${tabla}', RESEED, 1) WITH NO_INFOMSGS;
         ELSE
           DBCC CHECKIDENT ('${tabla}', RESEED, 0) WITH NO_INFOMSGS;`,
      );
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
    // Capitán del primer equipo: se le asocia el usuario de prueba con rol Jugador.
    let capitanPrimerEquipoId = 0;
    /** Plantel de cada equipo en Apertura, en orden de dorsal (titulares primero). */
    const planteles = new Map<number, Inscripto[]>();
    for (const equipo of equiposApertura) {
      const plantel: Inscripto[] = [];
      planteles.set(equipo.id, plantel);
      const inscripcion = await prisma.inscripcionEquipo.create({
        data: { torneoId: apertura.id, equipoId: equipo.id },
      });

      for (const dorsal of DORSALES) {
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
        const inscripto = await prisma.inscripcionJugador.create({
          data: {
            inscripcionEquipoId: inscripcion.id,
            jugadorId: jugador.id,
            dorsal,
            capitan: dorsal === DORSAL_CAPITAN,
          },
        });
        plantel.push({ inscripcionJugadorId: inscripto.id, dorsal });
        if (equipo === equiposApertura[0] && dorsal === DORSAL_CAPITAN) {
          capitanPrimerEquipoId = jugador.id;
        }
      }
    }

    // Mismo algoritmo que usa el caso de uso de la API (sin mezclar, para que el seed sea repetible).
    const fixture = generarFixture(
      equiposApertura.map((equipo) => equipo.id),
    ).map((fechaGenerada) =>
      fechaGenerada.partidos.map(
        (partido) => [partido.localId, partido.visitanteId] as const,
      ),
    );
    let cantidadEventos = 0;
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

        const partido = await prisma.partido.create({
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

        // Planilla del partido jugado (los WO y los suspendidos no tienen).
        if (estadoPartido === EstadoPartido.Finalizado) {
          const planilla = generarPlanilla(
            {
              local: planteles.get(localId)!,
              visitante: planteles.get(visitanteId)!,
            },
            golesLocal!,
            golesVisitante!,
            aleatorio,
          );
          // Ids generados antes de insertar, para relacionar los eventos (como en la API).
          const idFila = new Map(
            planilla.jugaron.map((inscripcionId) => [
              inscripcionId,
              randomUUID(),
            ]),
          );
          await prisma.partidoJugador.createMany({
            data: [...idFila].map(([inscripcionJugadorId, id]) => ({
              id,
              partidoId: partido.id,
              inscripcionJugadorId,
            })),
          });
          await prisma.evento.createMany({
            data: planilla.eventos.map((evento) => ({
              tipoEvento: evento.tipoEvento,
              minuto: evento.minuto,
              partidoJugadorId: idFila.get(evento.inscripcionJugadorId)!,
              partidoJugadorCambioId: evento.inscripcionJugadorEntraId
                ? idFila.get(evento.inscripcionJugadorEntraId)!
                : null,
            })),
          });
          cantidadEventos += planilla.eventos.length;
        }
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

    // #region Usuarios de prueba: uno por rol
    // Mismo servicio de hash que usa la API, para que el login los reconozca.
    const contrasenias = new ContraseniasService();
    const usuariosPrueba = [
      {
        email: 'administrador@ligahub.test',
        rol: Rol.Administrador,
        jugadorId: null,
      },
      { email: 'asistente@ligahub.test', rol: Rol.Asistente, jugadorId: null },
      {
        email: 'jugador@ligahub.test',
        rol: Rol.Jugador,
        jugadorId: capitanPrimerEquipoId,
      },
    ];
    for (const usuario of usuariosPrueba) {
      // Un hash por usuario: cada uno lleva su propia sal, como si se hubieran creado desde la API.
      await prisma.usuario.create({
        data: {
          email: usuario.email,
          contraseniaHash: await contrasenias.generarHash(contraseniaPrueba),
          jugadorId: usuario.jugadorId,
          roles: { create: { rol: usuario.rol } },
        },
      });
    }
    // #endregion

    console.log(
      `Seed completo: ${equipos.length} equipos, ${numeroJugador} jugadores, ` +
        `torneo ${apertura.id} "Apertura" (en curso, ${fixture.length} fechas, ${cantidadEventos} eventos), ` +
        `torneo ${clausura.id} "Clausura" (inscripción) y ${usuariosPrueba.length} usuarios de prueba.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
