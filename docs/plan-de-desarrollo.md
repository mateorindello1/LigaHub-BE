# Plan de desarrollo — LigaHub Backend

Registro de lo que se va haciendo, etapa por etapa: qué comandos se ejecutaron, qué archivos se crearon y para qué sirve cada cosa. Sirve para entender el proyecto y para poder rehacerlo desde cero.

Cada etapa tiene un estado: **Hecha**, **En curso** o **Pendiente**. Las etapas pendientes son una guía y pueden cambiar a medida que avancemos.

Como referencia, cada concepto se compara con su equivalente en .NET.

## Índice

| # | Etapa | Estado |
|:-:|:--|:-:|
| 0 | [Entorno: Node, fnm y pnpm](#etapa-0--entorno-node-fnm-y-pnpm) | Hecha |
| 1 | [Andamiaje del proyecto NestJS](#etapa-1--andamiaje-del-proyecto-nestjs) | Hecha |
| 2 | [Prisma y SQL Server](#etapa-2--prisma-y-sql-server) | Hecha |
| 3 | [Estructura por capas y primer CRUD: Torneo](#etapa-3--estructura-por-capas-y-primer-crud-torneo) | Hecha |
| 4 | [Validación, manejo de errores y seguridad básica](#etapa-4--validación-manejo-de-errores-y-seguridad-básica) | Pendiente |
| 5 | [CRUD de Equipo e Inscripción de equipo](#etapa-5--crud-de-equipo-e-inscripción-de-equipo) | Pendiente |
| 6 | [Listado con filtro y detalle](#etapa-6--listado-con-filtro-y-detalle) | Pendiente |
| 7 | [Caso de uso: generar el fixture](#etapa-7--caso-de-uso-generar-el-fixture) | Pendiente |
| 8 | [Documentación para la entrega](#etapa-8--documentación-para-la-entrega) | Pendiente |
| 9 | [Aprobación directa: login, roles, tests y ambientes](#etapa-9--aprobación-directa-login-roles-tests-y-ambientes) | Pendiente |

---

## Etapa 0 — Entorno: Node, fnm y pnpm

**Estado:** Hecha (2026-10-09)

**Objetivo:** tener la versión correcta de Node y el gestor de paquetes.

### Conceptos

- **Node.js** es el runtime que ejecuta JavaScript fuera del navegador. Equivale al runtime de .NET.
- **fnm** (Fast Node Manager) permite tener varias versiones de Node instaladas y cambiar entre ellas por proyecto. No hay un equivalente exacto en .NET; lo más cercano es fijar la versión del SDK con `global.json`.
- **pnpm** es el gestor de paquetes, como NuGet. Comparado con npm, instala más rápido y guarda una sola copia de cada paquete en el disco, compartida entre proyectos.
- **LTS** (Long Term Support) es la versión con soporte extendido. Se eligió **Node 24 LTS** porque es la que soporta oficialmente Prisma 7.

### Comandos

```powershell
fnm install 24
```

Instala Node 24 (quedó la 24.21.0). La versión por defecto de la PC sigue siendo la 26; el proyecto usa la 24 gracias al archivo `.node-version` de la etapa 1.

> En PowerShell, fnm necesita esta línea en el perfil (`$PROFILE`) para cambiar de versión solo al entrar a una carpeta:
> `fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression`

---

## Etapa 1 — Andamiaje del proyecto NestJS

**Estado:** Hecha (2026-10-09)

**Objetivo:** generar la estructura base del proyecto, verificar que compila y que corren los tests.

### Conceptos

- **NestJS** es un framework para APIs en Node que corre sobre Express. Impone una estructura parecida a ASP.NET Core: controllers, servicios inyectables e inyección de dependencias.
- **Módulos ES** (`"type": "module"` en `package.json`): el proyecto usa el sistema de módulos estándar de JavaScript. Por eso **los imports entre archivos propios terminan en `.js`** aunque el archivo sea `.ts` (`import { AppService } from './app.service.js'`): se escribe la ruta del archivo compilado. Es la regla de `"module": "nodenext"` en `tsconfig.json`.
- **Decoradores** (`@Controller()`, `@Get()`, `@Injectable()`, `@Module()`): son el equivalente a los atributos de C# (`[ApiController]`, `[HttpGet]`).

### Comandos

```powershell
git clone https://github.com/mateorindello1/LigaHub-BE.git C:\Users\mateo\source\repos\LigaHub-BE
cd C:\Users\mateo\source\repos\LigaHub-BE
Set-Content -Path .node-version -Value "24" -NoNewline
```

Clona el repo y fija la versión de Node del proyecto.

```powershell
pnpm dlx @nestjs/cli@latest new ligahub-be --directory . --package-manager pnpm --skip-git --strict
```

Genera el proyecto. `pnpm dlx` ejecuta el CLI de Nest sin instalarlo globalmente, como `dotnet new` con una plantilla descargada en el momento. Las opciones:

| Opción | Para qué |
|:--|:--|
| `--directory .` | Genera en la carpeta actual, no en una subcarpeta |
| `--package-manager pnpm` | Instala las dependencias con pnpm |
| `--skip-git` | No inicializa otro repositorio (ya existía) |
| `--strict` | TypeScript en modo estricto: obliga a manejar `null` y `undefined` explícitamente, como los nullable reference types de C# |

> El CLI falla si ya existen `README.md` o `.gitignore` en la carpeta. Se movieron temporalmente fuera, se generó el proyecto y después se restauraron.

```powershell
pnpm build
pnpm test
```

Verifican que compila y que pasa el test de ejemplo.

### Archivos creados

| Archivo                                     | Para qué sirve                                                                                   | En .NET                                     |
| :------------------------------------------ | :----------------------------------------------------------------------------------------------- | :------------------------------------------ |
| `package.json`                              | Nombre del proyecto, dependencias y scripts (`pnpm start:dev`, `pnpm test`…)                     | `.csproj` (las `PackageReference`)          |
| `pnpm-lock.yaml`                            | Versiones exactas instaladas, para que todos instalen lo mismo. Se versiona y no se edita a mano | `packages.lock.json`                        |
| `node_modules/`                             | Paquetes instalados. No se versiona                                                              | Caché de paquetes NuGet                     |
| `.node-version`                             | Versión de Node del proyecto, que lee fnm                                                        | `global.json`                               |
| `tsconfig.json`                             | Configuración del compilador de TypeScript                                                       | Propiedades de compilación del `.csproj`    |
| `tsconfig.build.json`                       | Igual que el anterior, pero excluye los tests al compilar para producción                        | Configuración Release                       |
| `nest-cli.json`                             | Configuración del CLI de Nest (carpeta de código, limpieza de `dist/`)                           | —                                           |
| `src/main.ts`                               | Punto de entrada: crea la aplicación y la pone a escuchar en el puerto 3000 o en `PORT`          | `Program.cs`                                |
| `src/app.module.ts`                         | Módulo raíz: registra controllers y servicios en el contenedor de inyección                      | Los `builder.Services.Add…` de `Program.cs` |
| `src/app.controller.ts`                     | Controller de ejemplo con un `GET /` que devuelve "Hello World!"                                 | Un `Controller`                             |
| `src/app.service.ts`                        | Servicio de ejemplo que usa el controller                                                        | Un servicio registrado con `AddScoped`      |
| `src/app.controller.spec.ts`                | Test unitario del controller                                                                     | Test de xUnit                               |
| `test/app.e2e-spec.ts`                      | Test end-to-end: levanta la app y le hace un pedido HTTP real                                    | Test con `WebApplicationFactory`            |
| `vitest.config.ts` / `vitest.config.e2e.ts` | Configuración de Vitest para tests unitarios (`*.spec.ts`) y end-to-end (`*.e2e-spec.ts`)        | Proyecto de tests                           |
| `.oxlintrc.json`                            | Reglas del linter oxlint                                                                         | Analizadores de Roslyn / `.editorconfig`    |
| `.prettierrc`                               | Formato del código: comillas simples y coma final                                                | `.editorconfig`                             |

### Archivos modificados a mano

- **`.gitignore`:** se mantuvo el original de GitHub (ya cubre `node_modules`, `dist`, `.env` y `coverage`) y se agregó:
  - `.vs/` y `.idea/`, carpetas de Visual Studio y JetBrains.
  - `!.env.example`, una excepción: la regla `.env.*` ignoraba también la plantilla de variables de entorno, que sí se tiene que subir.
- **`README.md`:** se reemplazó el que genera Nest por uno con la información del proyecto.
- **`docs/modelo-de-datos.drawio` y `.png`:** el modelo de datos. Es la versión vigente; los cambios del modelo se hacen sobre este archivo.

### Cómo probarlo

```powershell
pnpm start:dev
```

Y abrir `http://localhost:3000` en el navegador: tiene que responder "Hello World!".

---

## Etapa 2 — Prisma y SQL Server

**Estado:** Hecha (2026-10-09)

**Objetivo:** conectar la aplicación a SQL Server con Prisma, crear las tablas del modelo con una migración y dejar el cliente de Prisma disponible para inyectar.

### Conceptos

- **Prisma** es el ORM. Tiene tres piezas:
  - el **schema** (`prisma/schema.prisma`), donde se definen los modelos, como las entidades y la configuración de un `DbContext`;
  - las **migraciones**, archivos SQL generados comparando el schema con la base, como `Add-Migration` y `Update-Database`;
  - el **cliente generado**, un objeto con un método por tabla y tipos exactos para cada consulta, equivalente a los `DbSet<T>`.
- **Code first:** el modelo se escribe en el schema y la base se genera a partir de él.
- **Prisma 7 y no 8:** Prisma 8 todavía no soporta SQL Server ([supported databases](https://www.prisma.io/docs/orm/reference/supported-databases)). En npm, la etiqueta `latest` ya apunta a la 8, así que **hay que instalar siempre con la versión fija** (`@7.10.0`) e ignorar los avisos de "update available".
- **Adaptador de driver:** desde Prisma 7, la aplicación se conecta a través de un adaptador (`@prisma/adapter-mssql`, que usa el driver `node-mssql`). Las migraciones usan la URL de `prisma.config.ts`.
- **SQL Server 2022:** Prisma 7 soporta oficialmente las versiones 2017, 2019 y 2022, además de Azure SQL ([fuente](https://www.prisma.io/docs/orm/v7/reference/supported-databases)). La 2025 no está en la lista.
- **Autenticación SQL y no de Windows:** el driver no puede autenticarse con el usuario de Windows como hace .NET con `Integrated Security=true`. Por eso se usa un login SQL propio del proyecto.
- **Variables de entorno (`.env`):** la cadena de conexión no se escribe en el código. Va en `.env`, que no se versiona, y `.env.example` es la plantilla que sí se sube. Equivale a `appsettings.Development.json` con los secretos fuera del repositorio.

### Preparación de SQL Server (fuera del proyecto)

Se instaló **SQL Server 2022 Developer** (gratuito para desarrollo) como instancia por defecto y se configuró:

| Configuración | Dónde | Valor |
|:--|:--|:--|
| Autenticación | Instalador (o SSMS → Propiedades del servidor → Seguridad) | Modo mixto: SQL Server y Windows |
| TCP/IP | SQL Server Configuration Manager → Protocolos de MSSQLSERVER | Habilitado |
| Puerto | TCP/IP → Propiedades → Direcciones IP → IPAll | `1433` fijo, sin puertos dinámicos |

Login del proyecto, creado en SSMS:

```sql
CREATE LOGIN ligahub_app WITH PASSWORD = '<contraseña>';
ALTER SERVER ROLE dbcreator ADD MEMBER ligahub_app;
```

`dbcreator` le permite crear la base `LigaHub` en la primera migración (y quedar como dueño) y crear la base temporal ("shadow database") que usa `prisma migrate dev` para comparar el esquema. No tiene permisos de administrador del servidor.

> Para la entrega, la cátedra exige una base que no se ejecute en local. El plan es pasar a Azure SQL al final: cambiar `DATABASE_URL` y correr `pnpm db:deploy`.

### Comandos

```powershell
pnpm add @prisma/client@7.10.0 @prisma/adapter-mssql@7.10.0 dotenv
pnpm add -D prisma@7.10.0
```

Instala el cliente y el adaptador como dependencias de ejecución, y el CLI de Prisma solo para desarrollo, como un paquete de herramientas de EF (`Microsoft.EntityFrameworkCore.Tools`). `dotenv` carga el archivo `.env`.

```powershell
pnpm approve-builds @prisma/engines prisma
```

pnpm 11 no ejecuta los scripts de instalación de los paquetes salvo que se aprueben, como medida de seguridad. Prisma necesita el suyo para descargar el motor de migraciones. La aprobación queda guardada en `pnpm-workspace.yaml` (`allowBuilds`).

```powershell
pnpm exec prisma validate
pnpm exec prisma generate
```

`validate` revisa que el schema sea correcto. `generate` crea el cliente tipado en `src/generated/prisma/`. Hay que regenerarlo cada vez que cambia el schema; los scripts `postinstall` y `prebuild` lo hacen solos al instalar y al compilar.

### Archivos creados

| Archivo | Para qué sirve | En .NET |
|:--|:--|:--|
| `prisma/schema.prisma` | Modelos, tipos de SQL Server, relaciones, claves únicas e índices. Las opciones `moduleFormat = "esm"` e `importFileExtension = "js"` hacen que el cliente generado use imports con `.js`, como exige el proyecto | Entidades + `IEntityTypeConfiguration<T>` |
| `prisma.config.ts` | Dónde están el schema y las migraciones, y la URL de conexión leída de `DATABASE_URL` | Configuración del `DbContext` en `Program.cs` |
| `.env.example` | Plantilla de variables de entorno: `PORT` y `DATABASE_URL`. Se versiona | `appsettings.json` sin secretos |
| `.env` | Copia de la plantilla con la contraseña real. **No se versiona** | `appsettings.Development.json` / User Secrets |
| `src/prisma/prisma.service.ts` | Servicio inyectable que extiende `PrismaClient`, crea el adaptador de SQL Server, abre la conexión al iniciar y la cierra al apagar | El `DbContext` registrado con `AddDbContext` |
| `src/prisma/prisma.module.ts` | Módulo global que exporta `PrismaService`, para inyectarlo en cualquier módulo sin importarlo en cada uno | — |
| `src/generated/prisma/` | Cliente generado. **No se versiona** (se regenera) | Código generado por EF en tiempo de compilación |
| `pnpm-workspace.yaml` | Paquetes autorizados a ejecutar scripts de instalación | — |

### Archivos modificados

- **`src/main.ts`:** `import 'dotenv/config'` al principio, para cargar `.env` antes de crear la aplicación.
- **`src/app.module.ts`:** importa `PrismaModule`.
- **`package.json`:** scripts nuevos:

  | Script | Qué hace | En .NET |
  |:--|:--|:--|
  | `postinstall` | `prisma generate` después de `pnpm install` | — |
  | `prebuild` | `prisma generate` antes de `pnpm build` | — |
  | `pnpm db:migrate` | `prisma migrate dev`: compara el schema con la base, genera la migración y la aplica | `Add-Migration` + `Update-Database` |
  | `pnpm db:deploy` | `prisma migrate deploy`: aplica las migraciones pendientes, sin generar nuevas (para Azure) | `Update-Database` en producción |
  | `pnpm db:studio` | Abre Prisma Studio, un visor web de los datos | Explorador de SSMS |

- **`.gitignore`:** se agregó `src/generated/`.

### Primera migración

Con la contraseña de `ligahub_app` cargada en `.env`:

```powershell
pnpm db:migrate --name inicial
```

Prisma creó la base `LigaHub` (porque no existía), comparó el schema con la base vacía, generó el SQL y lo aplicó. Resultado:

| Archivo | Para qué sirve | En .NET |
|:--|:--|:--|
| `prisma/migrations/20261009191210_inicial/migration.sql` | El SQL de la migración: las 13 tablas con sus tipos, claves primarias, claves únicas, índices de las claves foráneas y las claves foráneas con `NO ACTION`, todo dentro de una transacción. **Se versiona** | El archivo de migración de `Add-Migration` |
| `prisma/migrations/migration_lock.toml` | Registra el motor de base (`mssql`) para que no se mezclen migraciones de otro motor. Se versiona y no se edita | — |
| Tabla `_prisma_migrations` (en la base) | Registra qué migraciones ya se aplicaron | `__EFMigrationsHistory` |

**Para modificar el modelo más adelante:** se cambia `schema.prisma` y se corre `pnpm db:migrate --name <descripcion>`. Prisma genera una migración nueva solo con la diferencia. Las migraciones ya aplicadas no se editan, igual que en EF.

### Cómo probarlo

```powershell
pnpm start:dev
```

En el log aparece `PrismaModule dependencies initialized` y `Nest application successfully started`, y `http://localhost:3000` responde. Si la conexión falla, la aplicación no arranca y muestra el error, porque `PrismaService` se conecta al iniciar.

Para ver las tablas y los datos: SSMS conectado a `localhost` (base `LigaHub`), o `pnpm db:studio`.

> El test end-to-end (`pnpm test:e2e`) ahora necesita la base levantada, porque la aplicación se conecta al iniciar.

## Etapa 3 — Estructura por capas y primer CRUD: Torneo

**Estado:** Hecha (2026-10-09)

**Objetivo:** fijar la estructura que se repite en cada CRUD, con Torneo como primer caso completo, de punta a punta contra la base.

### Conceptos

- **Arquitectura por capas** (requisito de la cátedra): cada pedido pasa por tres capas con responsabilidades separadas.

  | Capa | Archivo | Responsabilidad | En tu trabajo |
  |:--|:--|:--|:--|
  | Controller | `torneos.controller.ts` | Recibe el pedido HTTP, convierte los parámetros y delega. Sin lógica | Controller fino con `Mediator.Send` |
  | Servicio | `torneos.service.ts` | Casos de uso y reglas de negocio (estado inicial, no borrar con inscriptos, 404 si no existe) | Handlers + reglas de la entidad |
  | Repositorio | `torneos.repository.ts` | Acceso a datos con Prisma. Es la única capa que conoce Prisma | Repositorio específico sobre EF |

- **Módulo de Nest** (`torneos.module.ts`): agrupa el controller y los providers (servicio y repositorio) de una feature y los registra en el contenedor de inyección. Equivale a un método de extensión `AddTorneos(this IServiceCollection services)`. La carpeta `src/modules/torneos/` es la "unidad funcional", como tu carpeta `Unidades Funcionales/<Feature>/`.
- **Inyección de dependencias por constructor:** `constructor(private readonly torneosRepository: TorneosRepository)` declara la dependencia y Nest la resuelve sola, como en ASP.NET Core. `private readonly` en el parámetro crea y asigna el campo en una sola línea.
- **DTOs** (`dto/`): clases que describen el cuerpo de cada pedido. El cliente no puede mandar el `id` ni el estado: el estado inicial lo decide el servicio.
- **Enum de estado** (`estado-torneo.enum.ts`): la base guarda un `tinyint`; en el código se usa `EstadoTorneo.Inscripcion` en lugar del número 1. Equivale a un `enum` de C# guardado como `byte`.
- **Pipes de Nest:** `ParseIntPipe` convierte el `:id` de la URL a número y responde 400 si no lo es. Equivale al model binding con restricción de ruta `{id:int}`.
- **Excepciones HTTP:** `NotFoundException` (404) y `ConflictException` (409) se lanzan desde el servicio y Nest las convierte en la respuesta. Equivale a devolver `NotFound()`/`Conflict()`, o a tus excepciones tipadas capturadas por el middleware de errores.
- **Promesas y `async`/`await`:** funcionan igual que `Task` y `async`/`await` en C#. `Promise.all` equivale a `Task.WhenAll`.

### Comandos

```powershell
pnpm exec nest g module modules/torneos
pnpm exec nest g controller modules/torneos --no-spec
pnpm exec nest g service modules/torneos --no-spec
```

Generan el módulo, el controller y el servicio vacíos, registran el módulo en `app.module.ts` y el controller y el servicio en `torneos.module.ts`. `--no-spec` evita crear archivos de test vacíos (los tests se agregan en la etapa 9). El repositorio, los DTOs y el enum se crearon a mano.

### Archivos creados

```
src/modules/torneos/
├── dto/
│   ├── crear-torneo.dto.ts       Cuerpo de POST: nombre y anio
│   └── modificar-torneo.dto.ts   Cuerpo de PATCH: nombre y anio opcionales
├── estado-torneo.enum.ts         Inscripcion = 1, EnCurso = 2, Finalizado = 3
├── torneos.controller.ts         Los cinco endpoints
├── torneos.module.ts             Registra controller, servicio y repositorio
├── torneos.repository.ts         Consultas con Prisma
└── torneos.service.ts            Casos de uso y reglas de negocio
```

`src/app.module.ts` ahora importa `TorneosModule` (lo agregó el CLI).

### Endpoints

| Método y ruta | Qué hace | Respuestas |
|:--|:--|:--|
| `GET /torneos` | Lista los torneos, del año más reciente al más antiguo | 200 |
| `GET /torneos/:id` | Devuelve un torneo | 200, 404 si no existe, 400 si el id no es número |
| `POST /torneos` | Crea un torneo en estado Inscripcion | 201 con el torneo creado |
| `PATCH /torneos/:id` | Modifica nombre o año (solo lo que se envía) | 200, 404 |
| `DELETE /torneos/:id` | Borra el torneo | 204, 404, 409 si tiene equipos inscriptos o fixture |

Se usa `PATCH` y no `PUT` porque se modifican solo los campos enviados. El estado del torneo no se modifica por estos endpoints: va a cambiar con los casos de uso (por ejemplo, al generar el fixture pasa a EnCurso).

### Reglas de negocio implementadas

- Todo torneo nuevo empieza en estado **Inscripcion**.
- Modificar o borrar un torneo inexistente responde **404**, verificado en el servicio antes de llamar a la base (si no, Prisma lanzaría un error genérico).
- No se puede borrar un torneo con **equipos inscriptos o fechas de fixture** (409).

### Cómo probarlo

Con la API levantada (`pnpm start:dev`), desde PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/torneos -ContentType 'application/json' -Body '{"nombre":"Apertura","anio":2026}'
Invoke-RestMethod http://localhost:3000/torneos
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/torneos/1 -ContentType 'application/json' -Body '{"nombre":"Apertura 2026"}'
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/torneos/1
```

O con Postman o la extensión REST Client de VS Code.

### Limitación conocida (se resuelve en la etapa 4)

Todavía no hay validación de entrada: un `POST /torneos` con cuerpo vacío llega hasta Prisma, que falla, y la API responde **500**. Con la validación de la etapa 4 tiene que responder **400** indicando qué campo falta.

## Etapa 4 — Validación, manejo de errores y seguridad básica

**Estado:** Pendiente

- Validar los datos de entrada (DTOs con reglas, el equivalente a FluentValidation), con **lista blanca**: se rechazan los campos que no están en el DTO.
- Un filtro global de excepciones que devuelva errores en un formato JSON único, como el middleware de errores de tu trabajo, sin trazas ni mensajes internos.
- CORS restringido al origen del frontend y encabezados de seguridad con `helmet`.
- Decoradores `@Roles(...)` y `@Publico()` en cada endpoint, para dejar documentados los permisos aunque el login todavía no exista.

Detalle de las decisiones en [seguridad.md](seguridad.md).

## Etapa 5 — CRUD de Equipo e Inscripción de equipo

**Estado:** Pendiente

- Equipo: segundo CRUD simple, repitiendo el patrón de Torneo.
- Inscripción de equipo: CRUD dependiente (referencia a Equipo y a Torneo), con la validación de que un equipo no se inscriba dos veces en el mismo torneo.

## Etapa 6 — Listado con filtro y detalle

**Estado:** Pendiente

- Tabla de posiciones filtrada por torneo, ordenada por puntos.
- Detalle del equipo con datos de al menos dos clases de negocio (equipo, jugadores e inscripción).

## Etapa 7 — Caso de uso: generar el fixture

**Estado:** Pendiente

- A partir de los equipos inscriptos, generar las fechas y los partidos del torneo.
- Validar el estado del torneo y que no se genere dos veces.

## Etapa 8 — Documentación para la entrega

**Estado:** Pendiente

- `docs/README.md` como entrada, enlazado desde el README principal.
- Modelo de datos en Mermaid.
- Instrucciones de instalación, minutas, links a los PR.

## Etapa 9 — Aprobación directa: login, roles, tests y ambientes

**Estado:** Pendiente

- Login con JWT, contraseñas con Argon2id, límite de intentos, guard global de autenticación y guard de roles, y seed del primer administrador. Diseño completo en [seguridad.md](seguridad.md).
- Tests unitarios (uno por integrante) y de integración.
- Ambientes definidos con `.env`.
