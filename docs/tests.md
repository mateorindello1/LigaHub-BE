# Tests del backend

El backend tiene dos tipos de tests, los dos con [Vitest](https://vitest.dev/):

| Tipo | Qué prueba | Dónde | Comando |
|:--|:--|:--|:--|
| **Unitarios** | Reglas de negocio de los servicios y funciones puras (fixture, posiciones, marcador), sin base de datos: los repositorios se reemplazan por versiones en memoria | `src/**/*.spec.ts`, junto al código que prueban | `pnpm test` |
| **Integración** | La API completa (guards, validación, controllers, servicios, repositorios y filtro de errores) contra la base de Azure, con pedidos HTTP reales hechos con [Supertest](https://github.com/ladjs/supertest) | `test/*.e2e-spec.ts` | `pnpm test:e2e` |

Los tests del frontend (componentes y end-to-end con un navegador) están en el repositorio [LigaHub-FE](https://github.com/mateorindello1/LigaHub-FE/blob/main/docs/tests.md).

## Cómo correrlos

```bash
pnpm test            # unitarios (unos segundos)
pnpm test:cov        # unitarios con cobertura (reporte HTML en coverage/index.html)
pnpm test:e2e        # integración (alrededor de 70 segundos)
pnpm test:cov:e2e    # integración con cobertura (reporte HTML en coverage-e2e/index.html)
```

Para los de integración:

- **Configuración:** hace falta el `.env` completo (`DATABASE_URL`, `JWT_SECRET` y `SEED_CONTRASENIA`).
- **Datos:** la base tiene que tener los datos del seed (`pnpm db:seed`).
- **Red:** la IP de la máquina tiene que estar habilitada en el firewall de Azure SQL.

**Datos de prueba:** los tests de integración usan los usuarios del seed y modifican algunos datos por un momento (por ejemplo, cargan el resultado de un partido programado). Cada test deja todo como estaba, aunque falle a mitad de camino, y antes de empezar borra lo que haya quedado de una corrida anterior. Corren de a un archivo por vez (`fileParallelism: false`), porque comparten la base.

**Límite de intentos de login:** la API acepta 5 logins por minuto desde la misma IP. Cada archivo de test crea su propia instancia de la API (con su propio contador) y usa como mucho 5.

## Qué cubren

### Unitarios (122 tests en 17 archivos)

| Archivo | Qué prueba |
|:--|:--|
| `fixture/generar-fixture.spec.ts` | Método del círculo: fechas y cruces con cantidad par e impar de equipos, localía repartida, ida y vuelta |
| `posiciones/calcular-posiciones.spec.ts` | Puntos, orden de la tabla y desempates |
| `partidos/calcular-marcador.spec.ts` | Marcador a partir de goles y goles en contra; W.O. 3 a 0 |
| `partidos/resultados.service.spec.ts` | Caso de uso "cargar el resultado": jugadores de los dos equipos, eventos de quien jugó, reglas del cambio, W.O., suspendido, horario, anulación |
| `partidos/partidos.service.spec.ts` | Programación: superposición de canchas y de equipos, partidos jugados, suspendidos |
| `torneos/torneos.service.spec.ts` | Estado inicial, modificación parcial, 404, borrado con datos asociados |
| `equipos/equipos.service.spec.ts` | Nombre único sin importar mayúsculas, escudo opcional, borrado con datos asociados |
| `inscripciones-equipo/inscripciones-equipo.service.spec.ts` | Inscripciones abiertas o cerradas, equipo repetido, 404, cambio de equipo, baja con jugadores |
| `inscripciones-jugador/inscripciones-jugador.service.spec.ts` | Dorsal único por equipo, un jugador por torneo, traspaso de la capitanía, torneo finalizado |
| `jugadores/jugadores.service.spec.ts` | DNI único y permiso por pertenencia del rol Jugador |
| `canchas/canchas.service.spec.ts` | Nombre de predio único, número de cancha único por predio, borrados con datos asociados |
| `usuarios/usuarios.service.spec.ts` | Gestión de usuarios: email único, rol Jugador y jugador asociado, el administrador no se quita su rol ni se borra |
| `usuarios/contrasenias.service.spec.ts` | Hash Argon2id y verificación |
| `auth/auth.service.spec.ts` | Login: token de acceso con el id, el email y los roles, que vence a los 15 minutos, y token de refresco de 7 días guardado como hash. Refresco con rotación; reutilizar un token usado revoca la sesión; token faltante, inexistente o vencido; cierre de sesión. Usuario de la sesión sin el hash y 401 si ya no existe |
| `auth/roles.guard.spec.ts` | Guard de roles: público, sin roles, con y sin el rol requerido |
| `config/configuracion.spec.ts` | Validación del `.env` al arrancar, valores por defecto de la sesión y conversión de duraciones |
| `app.controller.spec.ts` | Endpoint raíz (el que genera Nest al crear el proyecto) |

### Integración (26 tests en 7 archivos)

| Archivo | Qué prueba |
|:--|:--|
| `auth.e2e-spec.ts` | Login correcto (sin el hash en la respuesta), incorrecto o con email inexistente (401 con el mismo mensaje), email mal formado (400), `GET /auth/yo` con token válido, sin token o adulterado, y límite de intentos (429 desde el sexto). Cookie del token de refresco (`HttpOnly`, `Secure`, `SameSite`, `Path=/auth`); refresco con rotación y reutilización que revoca la sesión; refresco sin cookie; cierre de sesión |
| `permisos.e2e-spec.ts` | Endpoints públicos sin sesión; 401 sin token; 403 con un rol que no alcanza; el Administrador crea y borra un torneo; `GET /auth/yo` con cualquier rol |
| `usuarios.e2e-spec.ts` | Ciclo de un usuario: alta, cambio de rol que rige con el mismo token, cambio de contraseña y baja |
| `jugadores.e2e-spec.ts` | Permiso por pertenencia del Jugador; alta, inscripción con capitanía y reglas del plantel |
| `predios.e2e-spec.ts` | Predio y cancha; programación sin superponer canchas ni equipos |
| `resultados.e2e-spec.ts` | Caso de uso "cargar el resultado": carga, corrección a W.O. y anulación; la tabla de posiciones se actualiza sola |
| `app.e2e-spec.ts` | La API arranca y responde en `/` (el que genera Nest al crear el proyecto) |

## Evidencia de ejecución

### Integración continua (GitHub Actions)

En cada push y pull request a `main`, el workflow [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) corre en GitHub:
1. Instala las dependencias (`pnpm install --frozen-lockfile`).
2. Corre el lint.
3. Compila.
4. Ejecuta los tests unitarios con cobertura.

El reporte de cobertura queda como artefacto de cada ejecución. El resultado de cada corrida se ve en la pestaña [Actions](https://github.com/mateorindello1/LigaHub-BE/actions) del repositorio.

Los tests de integración no corren en GitHub: la base de Azure solo acepta conexiones de las IP habilitadas en su firewall. Se corren en local.

### Última ejecución local (2026-11-10)

**Unitarios** (`pnpm test:cov`, después de S-7):

```
 Test Files  17 passed (17)
      Tests  122 passed (122)

Statements   : 51.38% ( 555/1080 )
Branches     : 57.88% ( 290/501 )
Functions    : 30.64% ( 114/372 )
Lines        : 52.09% ( 547/1050 )
```

**Integración** (`pnpm test:cov:e2e`, contra Azure). Esta corrida es anterior a S-7, que agregó 4 tests a `auth.e2e-spec.ts`:

```
 Test Files  7 passed (7)
      Tests  22 passed (22)

Statements   : 73.95% ( 744/1006 )
Branches     : 52.22% ( 246/471 )
Functions    : 74.85% ( 262/350 )
Lines        : 74.74% ( 731/978 )
```

**Cómo leer la cobertura:** los dos reportes miden todo el código propio (`src/`, sin lo que genera Prisma). Se complementan:
- **Unitarios:** cubren las reglas de negocio de los servicios y las funciones puras, que es donde está la lógica. No cargan controllers ni repositorios.
- **Integración:** cubren el recorrido completo de un pedido. Por eso llegan a controllers, repositorios, guards y el filtro de errores.
