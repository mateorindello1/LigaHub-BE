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
| 4 | [Validación, manejo de errores y seguridad básica](#etapa-4--validación-manejo-de-errores-y-seguridad-básica) | Hecha |
| 5 | [CRUD de Equipo e Inscripción de equipo](#etapa-5--crud-de-equipo-e-inscripción-de-equipo) | Hecha |
| 6 | [Listado con filtro y detalle](#etapa-6--listado-con-filtro-y-detalle) | Hecha |
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
- **`package.json`:** scripts nuevos (ver la tabla de abajo).
- **`.gitignore`:** se agregó `src/generated/`.

Scripts nuevos de `package.json`:

| Script | Qué hace | En .NET |
|:--|:--|:--|
| `postinstall` | `prisma generate` después de `pnpm install` | — |
| `prebuild` | `prisma generate` antes de `pnpm build` | — |
| `pnpm db:migrate` | `prisma migrate dev`: compara el schema con la base, genera la migración y la aplica | `Add-Migration` + `Update-Database` |
| `pnpm db:deploy` | `prisma migrate deploy`: aplica las migraciones pendientes, sin generar nuevas (para Azure) | `Update-Database` en producción |
| `pnpm db:studio` | Abre Prisma Studio, un visor web de los datos | Explorador de SSMS |

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

> El test end-to-end (`pnpm test:e2e`) ahora necesita la base levantada, porque la aplicación se conecta al iniciar (y, desde la etapa 4, carga `.env` con `setupFiles`).

## Etapa 3 — Estructura por capas y primer CRUD: Torneo

**Estado:** Hecha (2026-10-09)

**Objetivo:** fijar la estructura que se repite en cada CRUD, con Torneo como primer caso completo, de punta a punta contra la base.

### Conceptos

**Arquitectura por capas** (requisito de la cátedra): cada pedido pasa por tres capas con responsabilidades separadas.

| Capa | Archivo | Responsabilidad | En tu trabajo |
|:--|:--|:--|:--|
| Controller | `torneos.controller.ts` | Recibe el pedido HTTP, convierte los parámetros y delega. Sin lógica | Controller fino con `Mediator.Send` |
| Servicio | `torneos.service.ts` | Casos de uso y reglas de negocio (estado inicial, no borrar con inscriptos, 404 si no existe) | Handlers + reglas de la entidad |
| Repositorio | `torneos.repository.ts` | Acceso a datos con Prisma. Es la única capa que conoce Prisma | Repositorio específico sobre EF |

Otros conceptos:

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

### Limitación (resuelta en la etapa 4)

Sin validación de entrada, un `POST /torneos` con cuerpo vacío llegaba hasta Prisma y la API respondía **500**. Desde la etapa 4 responde **400** indicando qué campo falta.

## Etapa 4 — Validación, manejo de errores y seguridad básica

**Estado:** Hecha (2026-10-09)

**Objetivo:** que la API valide todo lo que recibe, responda los errores siempre con el mismo formato y en castellano, y tenga las medidas de seguridad básicas definidas en [seguridad.md](seguridad.md).

### Conceptos

- **class-validator:** reglas de validación como decoradores en las propiedades del DTO (`@IsString()`, `@MaxLength(100)`, `@IsInt()`). Equivale a DataAnnotations, o a un validador de FluentValidation escrito en la propia clase.
- **class-transformer:** convierte el JSON recibido (un objeto plano) en una instancia de la clase DTO, que es lo que permite aplicar los decoradores. `@Transform` modifica un valor antes de validarlo; se usa para recortar espacios, así `"   "` cuenta como vacío.
- **Pipe:** se ejecuta antes del método del controller y puede transformar o rechazar los datos. El `ValidationPipe` global valida cada cuerpo contra su DTO, como el pipeline behavior de validación de tu trabajo.
- **Filtro de excepciones:** atrapa cualquier excepción que salga de un controller y arma la respuesta. Equivale al middleware de manejo de errores de ASP.NET Core (`UseExceptionHandler`).
- **`APP_PIPE` y `APP_FILTER`:** registran el pipe y el filtro como globales desde el módulo raíz, y no desde `main.ts`, para que también apliquen en los tests end-to-end. Equivale a agregar un filtro global en `AddControllers(o => o.Filters.Add(...))`.
- **helmet:** middleware que agrega encabezados HTTP de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options`…) y quita `X-Powered-By`, que revelaba que la API usa Express.
- **CORS:** el navegador solo deja que una página llame a una API de otro origen si la API lo autoriza. Se autoriza únicamente el origen del frontend, como `AddCors` con `WithOrigins`.

> **Atención — orden de los decoradores:** class-validator los evalúa **de abajo hacia arriba**. Como el pipe informa solo el primer error de cada campo (`stopAtFirstError`), la regla más básica (el tipo) va **abajo** y la más específica (el largo, el rango) **arriba**. Si se invierte, un campo vacío responde "admite hasta 100 caracteres" en lugar de "es obligatorio".

### Comandos

```powershell
pnpm add class-validator class-transformer helmet
```

### Formato de error de la API

Todas las respuestas de error tienen la misma forma (`RespuestaError`):

```json
{
  "estado": 400,
  "error": "Solicitud inválida",
  "mensaje": "Los datos enviados no son válidos.",
  "detalles": [
    { "campo": "nombre", "mensajes": ["El nombre es obligatorio."] },
    { "campo": "anio", "mensajes": ["El año no puede ser anterior a 2000."] }
  ],
  "ruta": "/torneos",
  "fecha": "2026-10-09T20:35:15.000Z"
}
```

`detalles` solo aparece en los errores de validación. El frontend puede usarlo para marcar cada campo del formulario.

| Origen del error | Respuesta |
|:--|:--|
| Validación del DTO | 400 con `detalles` por campo |
| Campo no declarado en el DTO (lista blanca) | 400 "Este campo no está permitido." |
| JSON mal formado | 400 "El cuerpo del pedido no es un JSON válido." |
| `:id` no numérico (`ParseIdPipe`) | 400 "El id debe ser un número entero." |
| Excepciones lanzadas por los servicios (`NotFoundException`, `ConflictException`) | Su código y su mensaje |
| Ruta inexistente | 404 "La ruta solicitada no existe." |
| Prisma P2002 (clave única) | 409 "Ya existe un registro con esos datos." |
| Prisma P2003 (clave foránea) | 409 "La operación no es posible porque hay datos relacionados." |
| Prisma P2025 (registro inexistente) | 404 "El registro no existe." |
| Cualquier otro error | 500 con mensaje genérico. El detalle y la traza se registran en el log del servidor, nunca en la respuesta |

### Archivos creados

```
src/common/
├── errores/
│   ├── excepciones.filter.ts       Filtro global: traduce cada excepción al formato RespuestaError
│   └── respuesta-error.ts          Interfaces RespuestaError y DetalleError
├── seguridad/
│   ├── publico.decorator.ts        @Publico(): endpoint sin login (como [AllowAnonymous])
│   ├── roles.decorator.ts          @Roles(...): roles permitidos (como [Authorize(Roles = ...)])
│   └── rol.enum.ts                 Administrador = 1, Asistente = 2, Jugador = 3
└── validacion/
    ├── crear-pipe-validacion.ts    ValidationPipe global con lista blanca y errores por campo
    ├── parse-id.pipe.ts            Convierte :id a número, con el mensaje en castellano
    └── transformaciones.ts         recortarTexto, para usar con @Transform
```

`@Publico()` y `@Roles()` por ahora **solo documentan** los permisos: guardan un dato en el endpoint que nadie lee todavía. Tienen efecto cuando se agreguen los guards en la etapa 9.

### Archivos modificados

| Archivo | Cambio |
|:--|:--|
| `src/app.module.ts` | Registra el pipe de validación (`APP_PIPE`) y el filtro de excepciones (`APP_FILTER`) como globales |
| `src/main.ts` | Agrega `helmet()` y habilita CORS solo para los orígenes de `CORS_ORIGIN`. Si la variable no está, no habilita CORS |
| `src/modules/torneos/dto/*.ts` | Reglas de validación con mensajes en castellano. En la modificación, `ValidateIf` valida un campo solo si vino, y a diferencia de `@IsOptional` no deja pasar `null` |
| `src/modules/torneos/torneos.controller.ts` | `@Publico()` en las consultas, `@Roles(Rol.Administrador)` en alta, modificación y baja, y `ParseIdPipe` en lugar de `ParseIntPipe` |
| `.env.example` y `.env` | Nueva variable `CORS_ORIGIN=http://localhost:5173`, el puerto por defecto de Vite |
| `vitest.config.e2e.ts` | `setupFiles: ['dotenv/config']`: carga `.env` antes de los tests end-to-end. Sin eso, la app no encontraba `DATABASE_URL` y el test fallaba desde la etapa 2 |

### Cómo probarlo

```powershell
# Cuerpo vacío: 400 con un error por campo
Invoke-WebRequest -Method Post -Uri http://localhost:3000/torneos -ContentType 'application/json' -Body '{}'

# Campo no permitido: 400 "Este campo no está permitido."
Invoke-WebRequest -Method Post -Uri http://localhost:3000/torneos -ContentType 'application/json' -Body '{"nombre":"Clausura","anio":2026,"estadoTorneo":3}'

# Los espacios de los extremos se recortan: 201 con "Clausura"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/torneos -ContentType 'application/json' -Body '{"nombre":"  Clausura  ","anio":2026}'
```

`Invoke-WebRequest` lanza una excepción con los 4xx; el cuerpo del error está en `$_.ErrorDetails.Message`. En Postman se ve directamente.

Para CORS: un pedido con el encabezado `Origin: http://localhost:5173` recibe `Access-Control-Allow-Origin`; con cualquier otro origen, no.

## Etapa 5 — CRUD de Equipo e Inscripción de equipo

**Estado:** Hecha (2026-10-09)

**Objetivo:** el segundo CRUD simple (Equipo) y el CRUD dependiente (Inscripción de equipo, que referencia a Torneo y a Equipo), con la primera modificación del modelo a través de una migración.

### Decisiones

| Tema | Decisión | Por qué |
|:--|:--|:--|
| `Equipo.escudoURL` | Pasa a ser opcional | Un equipo se puede crear sin escudo y cargarlo después |
| `Equipo.nombre` | Pasa a ser único | Dos equipos con el mismo nombre se confundirían en el fixture y las posiciones |
| Rutas de inscripción | Anidadas en el torneo: `/torneos/:torneoId/inscripciones` | La inscripción pertenece a un torneo; la ruta lo refleja |
| Modificación de inscripción | Permite cambiar el equipo inscripto | Es lo único modificable por ahora. Cuando la inscripción tenga más datos (pago, documentación), se agregan al mismo PATCH |

### Conceptos

- **Modificar el modelo:** se cambia `schema.prisma` y se genera una migración nueva con solo la diferencia. Las migraciones ya aplicadas no se tocan, igual que en EF.
- **Migraciones con advertencias:** cuando un cambio puede fallar con datos existentes (por ejemplo, una clave única nueva con valores repetidos), `prisma migrate dev` pide confirmación y **solo funciona en una terminal interactiva**. Por eso las migraciones se corren desde la terminal propia, no desde scripts automáticos.
- **Reutilizar servicios entre módulos:** un módulo **exporta** su servicio (`exports: [TorneosService]`) y otro lo **importa** (`imports: [TorneosModule]`) para inyectarlo. Así Inscripciones valida que el torneo y el equipo existan usando sus servicios, sin consultar sus tablas. Equivale a referenciar el proyecto de otra unidad funcional e inyectar su servicio.
- **Tipos derivados de la consulta:** el repositorio de inscripciones define los campos a devolver en una constante (`CAMPOS_INSCRIPCION`, que incluye los datos del equipo) y el tipo de la respuesta se deduce de ella con `Prisma.InscripcionEquipoGetPayload`. Si se agrega un campo a la consulta, el tipo cambia solo. Es lo que en EF sería proyectar con `Select` a un DTO, pero sin escribir la clase.
- **`@IsOptional` frente a `ValidateIf`:** en el escudo se usa `@IsOptional` porque `null` es un valor válido ("sin escudo"); en el nombre se usa `ValidateIf` porque `null` no lo es.
- **Validación en el servicio más clave única en la base:** el nombre de equipo y la inscripción duplicada se verifican en el servicio, para responder 409 con un mensaje claro. La clave única de la base queda como respaldo (si se cuela un duplicado, el filtro responde el 409 genérico de P2002). La comparación del nombre no distingue mayúsculas, porque usa la intercalación (*collation*) de SQL Server.

### Comandos

```powershell
# Después de editar prisma/schema.prisma (escudoURL opcional y nombre único)
pnpm db:migrate --name equipo_escudo_opcional_nombre_unico
```

Generó `prisma/migrations/20261009205922_equipo_escudo_opcional_nombre_unico/migration.sql`:

```sql
ALTER TABLE [dbo].[Equipo] ALTER COLUMN [escudoURL] VARCHAR(500) NULL;
ALTER TABLE [dbo].[Equipo] ADD CONSTRAINT [Equipo_nombre_key] UNIQUE NONCLUSTERED ([nombre]);
```

```powershell
pnpm exec nest g module modules/equipos
pnpm exec nest g controller modules/equipos --no-spec
pnpm exec nest g service modules/equipos --no-spec
pnpm exec nest g module modules/inscripciones-equipo
pnpm exec nest g controller modules/inscripciones-equipo --no-spec
pnpm exec nest g service modules/inscripciones-equipo --no-spec
```

### Archivos creados

```
src/common/validacion/
└── parse-uuid.pipe.ts                         Valida ids uniqueidentifier, con mensaje en castellano

src/modules/equipos/
├── dto/crear-equipo.dto.ts                    nombre obligatorio; escudoURL opcional (URL http/https)
├── dto/modificar-equipo.dto.ts                Campos opcionales; "escudoURL": null quita el escudo
├── equipos.controller.ts
├── equipos.module.ts                          Exporta EquiposService
├── equipos.repository.ts
└── equipos.service.ts

src/modules/inscripciones-equipo/
├── dto/crear-inscripcion-equipo.dto.ts        equipoId (el torneo va en la ruta)
├── dto/modificar-inscripcion-equipo.dto.ts    equipoId
├── inscripciones-equipo.controller.ts         Rutas anidadas en /torneos/:torneoId/inscripciones
├── inscripciones-equipo.module.ts             Importa TorneosModule y EquiposModule
├── inscripciones-equipo.repository.ts         Devuelve cada inscripción con los datos del equipo
└── inscripciones-equipo.service.ts
```

### Archivos modificados

| Archivo | Cambio |
|:--|:--|
| `prisma/schema.prisma` | `escudoURL String?` y `nombre String @unique` en Equipo |
| `src/modules/torneos/torneos.module.ts` | Exporta `TorneosService` |
| `src/app.module.ts` | Importa `EquiposModule` e `InscripcionesEquipoModule` (lo agregó el CLI) |
| `docs/modelo-de-datos.drawio` y `.png` | `UQ1` en `Nombre` y `null` en `EscudoURL` de Equipo |

### Endpoints

**Equipos**

| Método y ruta | Qué hace | Respuestas |
|:--|:--|:--|
| `GET /equipos` | Lista los equipos por nombre | 200 |
| `GET /equipos/:id` | Devuelve un equipo | 200, 404 |
| `POST /equipos` | Crea un equipo | 201, 400, 409 si el nombre ya existe |
| `PATCH /equipos/:id` | Modifica nombre o escudo | 200, 400, 404, 409 |
| `DELETE /equipos/:id` | Borra el equipo | 204, 404, 409 si tiene inscripciones o partidos |

**Inscripciones de equipos**

| Método y ruta | Qué hace | Respuestas |
|:--|:--|:--|
| `GET /torneos/:torneoId/inscripciones` | Lista los equipos inscriptos en el torneo | 200, 404 si el torneo no existe |
| `GET /torneos/:torneoId/inscripciones/:id` | Devuelve una inscripción del torneo | 200, 400 si el id no es UUID, 404 |
| `POST /torneos/:torneoId/inscripciones` | Inscribe un equipo (`{ "equipoId": 1 }`) | 201, 400, 404, 409 |
| `PATCH /torneos/:torneoId/inscripciones/:id` | Cambia el equipo inscripto | 200, 400, 404, 409 |
| `DELETE /torneos/:torneoId/inscripciones/:id` | Da de baja la inscripción | 204, 404, 409 |

Cada inscripción se devuelve con su equipo:

```json
{
  "id": "f7390b2d-91da-4dd8-ae3b-7fd2fd10189d",
  "torneoId": 6,
  "equipoId": 4,
  "equipo": { "id": 4, "nombre": "River", "escudoURL": null }
}
```

### Reglas de negocio

**Equipo**
- El nombre es obligatorio y no puede repetirse, sin distinguir mayúsculas (409).
- El escudo es opcional y, si viene, tiene que ser una URL http o https.
- No se puede borrar un equipo con inscripciones o partidos (409).

**Inscripción de equipo**
- El torneo tiene que existir (404) y estar en estado **Inscripcion** para dar de alta, modificar o borrar inscripciones (409 "Las inscripciones del torneo están cerradas").
- El equipo tiene que existir (404).
- Un equipo no puede inscribirse dos veces en el mismo torneo (409).
- Pedir una inscripción a través de otro torneo responde 404: la inscripción tiene que pertenecer al torneo de la ruta.
- No se puede borrar una inscripción que ya tiene jugadores inscriptos (409).
- Borrar un torneo con inscripciones o un equipo inscripto sigue respondiendo 409 (reglas de las etapas 3 y 5).

### Cómo probarlo

Con la API levantada:

```powershell
$equipo = Invoke-RestMethod -Method Post -Uri http://localhost:3000/equipos -ContentType 'application/json' -Body '{"nombre":"River"}'
$torneo = Invoke-RestMethod -Method Post -Uri http://localhost:3000/torneos -ContentType 'application/json' -Body '{"nombre":"Apertura","anio":2026}'
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/torneos/$($torneo.id)/inscripciones" -ContentType 'application/json' -Body "{`"equipoId`":$($equipo.id)}"
Invoke-RestMethod "http://localhost:3000/torneos/$($torneo.id)/inscripciones"
```

Se probaron 24 casos (altas, duplicados con distintas mayúsculas, URL inválida, quitar el escudo con `null`, equipo y torneo inexistentes, UUID inválido, inscripción pedida desde otro torneo, borrados con datos asociados y torneo con inscripciones cerradas), sin errores 500.

## Etapa 6 — Listado con filtro y detalle

**Estado:** Hecha (2026-10-09)

**Objetivo:** cumplir el requisito "listado con filtro + detalle" de la cátedra: un listado filtrado por al menos un atributo y, al seleccionar un elemento, un pedido al backend que devuelve más información, con datos de al menos dos clases de negocio.

### Diseño

| Requisito | Implementación |
|:--|:--|
| Listado | Tabla de posiciones de un torneo |
| Filtro | El torneo: `GET /torneos/:torneoId/posiciones`. En el frontend, un selector de torneo |
| Detalle | `GET /torneos/:torneoId/equipos/:equipoId`: el equipo en ese torneo, con su línea de la tabla, sus partidos y sus jugadores |
| Clases de negocio del detalle | Torneo, Equipo, InscripcionEquipo, Partido, FechaFixture, Cancha, Predio, InscripcionJugador y Jugador |

### Conceptos

- **La tabla no se guarda, se calcula.** Sale de los partidos con resultado (estado Finalizado o WO). Guardarla en una tabla obligaría a mantenerla sincronizada cada vez que cambia un resultado.
- **Función pura para el cálculo** (`calcular-posiciones.ts`): recibe los equipos y los partidos y devuelve la tabla, sin acceder a la base. Se prueba con tests unitarios sin levantar nada. Es el equivalente a tener la regla en el dominio y no en el handler.
- **Reglas de la tabla:** victoria 3 puntos, empate 1. Orden: puntos, diferencia de gol, goles a favor y nombre. Aparecen todos los equipos inscriptos, aunque no hayan jugado.
- **Consultas en paralelo:** `Promise.all` lanza las consultas independientes a la vez, como `Task.WhenAll`.
- **Clave única compuesta en Prisma:** `findUnique({ where: { equipoId_torneoId: { equipoId, torneoId } } })` busca por la clave única (`equipoId`, `torneoId`). Prisma genera ese nombre uniendo los campos con `_`.
- **Seed:** script que carga datos iniciales, como `HasData` o un `DbInitializer` en EF. Se configura en `prisma.config.ts` (`migrations.seed`) y se corre con `pnpm db:seed`.
- **tsx:** ejecuta archivos TypeScript directamente, sin compilarlos antes. Se usa para el seed, que no es parte de la aplicación de Nest.
- **Tests unitarios con Vitest:** `describe` agrupa los casos e `it` define cada uno; `expect(...).toEqual(...)` es el `Assert.Equal` de xUnit. Se mantiene el formato Arrange/Act/Assert.

### Comandos

```powershell
pnpm add -D tsx
pnpm approve-builds esbuild   # tsx usa esbuild; pnpm 11 pide aprobar su script de instalación
pnpm db:seed                  # carga los datos de demostración
pnpm test                     # corre los tests unitarios
```

> **`pnpm db:seed` borra todos los datos de la base** y carga siempre el mismo conjunto. No se ejecuta si `NODE_ENV=production`.

### Datos del seed

| Dato | Contenido |
|:--|:--|
| Predio | "Complejo Parque Norte", con canchas 1 y 2 |
| Equipos | 8 equipos ficticios (ids 1 a 8) |
| Torneo 1: Apertura 2026 | En curso. Equipos 1 a 6, con 7 jugadores cada uno (el dorsal 10 es capitán). Fixture de 5 fechas, todos contra todos: fechas 1 a 3 jugadas (con un WO y un partido suspendido en la fecha 3), fechas 4 y 5 programadas |
| Torneo 2: Clausura 2026 | Inscripción abierta. Equipos 5 a 8 inscriptos, sin fixture ni jugadores |

Los ids vuelven a empezar en 1 en cada ejecución (`DBCC CHECKIDENT ... RESEED`), así los ejemplos de esta documentación siempre funcionan. Los goles se generan con una semilla fija: salen iguales cada vez.

### Archivos creados

```
src/modules/partidos/
└── estado-partido.enum.ts          Programado, Finalizado, WO, Suspendido; estados que cuentan para la tabla

src/modules/posiciones/
├── calcular-posiciones.ts          Función pura que arma la tabla
├── calcular-posiciones.spec.ts     6 tests unitarios del cálculo
├── detalle-equipo.ts               Tipos de la respuesta del detalle
├── posiciones.controller.ts        GET /torneos/:torneoId/posiciones y /equipos/:equipoId
├── posiciones.module.ts            Importa TorneosModule
├── posiciones.repository.ts        Consultas de equipos, partidos e inscripción con jugadores
└── posiciones.service.ts           Arma la tabla y el detalle

prisma/
└── seed.ts                         Datos de demostración
```

### Archivos modificados

| Archivo | Cambio |
|:--|:--|
| `prisma.config.ts` | `migrations.seed: 'tsx prisma/seed.ts'` |
| `package.json` | Script `db:seed` y dependencia de desarrollo `tsx` |
| `pnpm-workspace.yaml` | `esbuild` autorizado a ejecutar su script de instalación |
| `src/app.module.ts` | Importa `PosicionesModule` |
| `README.md` | Scripts de base de datos en la tabla de scripts |

### Endpoints

| Método y ruta | Qué devuelve | Respuestas |
|:--|:--|:--|
| `GET /torneos/:torneoId/posiciones` | La tabla del torneo: posición, equipo, PJ, G, E, P, GF, GC, DG y puntos | 200, 404 si el torneo no existe |
| `GET /torneos/:torneoId/equipos/:equipoId` | El detalle del equipo en el torneo | 200, 404 si el torneo no existe o el equipo no está inscripto |

Ejemplo de detalle (resumido):

```json
{
  "torneo": { "id": 1, "nombre": "Apertura", "anio": 2026, "estadoTorneo": 2 },
  "equipo": { "id": 1, "nombre": "Los Halcones", "escudoURL": null },
  "inscripcionId": "…",
  "posicion": { "posicion": 6, "partidosJugados": 3, "ganados": 0, "puntos": 0, "…": "…" },
  "partidos": [
    {
      "numeroFecha": 1, "condicion": "Local", "rival": { "id": 6, "nombre": "Estrella Roja" },
      "golesAFavor": 0, "golesEnContra": 1, "resultado": "Perdido",
      "cancha": { "numero": 1, "predio": "Complejo Parque Norte" }, "…": "…"
    }
  ],
  "jugadores": [
    { "dorsal": 10, "nombres": "…", "apellidos": "Díaz", "capitan": true, "…": "…" }
  ]
}
```

Los partidos sin resultado (programados o suspendidos) tienen `golesAFavor`, `golesEnContra` y `resultado` en `null`.

### Cómo probarlo

```powershell
pnpm db:seed
pnpm start:dev
```

```powershell
Invoke-RestMethod http://localhost:3000/torneos/1/posiciones | Format-Table posicion, @{n='equipo';e={$_.equipo.nombre}}, partidosJugados, puntos
Invoke-RestMethod http://localhost:3000/torneos/1/equipos/1
```

Se verificó la tabla del Apertura contra el mismo cálculo hecho en SQL directamente sobre la base: coinciden puntos, goles y orden.

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
