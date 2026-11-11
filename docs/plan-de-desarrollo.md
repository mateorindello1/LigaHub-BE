# Plan de desarrollo — LigaHub Backend

Registro de lo que se va haciendo, etapa por etapa: qué comandos se ejecutaron, qué archivos se crearon y para qué sirve cada cosa. Sirve para entender el proyecto y para poder rehacerlo desde cero.

Cada etapa tiene un estado: **Hecha**, **En curso** o **Pendiente**. Las etapas pendientes son una guía y pueden cambiar a medida que avancemos.

Como referencia, cada concepto se compara con su equivalente en .NET.

## Índice

|  #  | Etapa                                                                                                             |  Estado   |
| :-: | :---------------------------------------------------------------------------------------------------------------- | :-------: |
|  0  | [Entorno: Node, fnm y pnpm](#etapa-0--entorno-node-fnm-y-pnpm)                                                    |   Hecha   |
|  1  | [Andamiaje del proyecto NestJS](#etapa-1--andamiaje-del-proyecto-nestjs)                                          |   Hecha   |
|  2  | [Prisma y SQL Server](#etapa-2--prisma-y-sql-server)                                                              |   Hecha   |
|  3  | [Estructura por capas y primer CRUD: Torneo](#etapa-3--estructura-por-capas-y-primer-crud-torneo)                 |   Hecha   |
|  4  | [Validación, manejo de errores y seguridad básica](#etapa-4--validación-manejo-de-errores-y-seguridad-básica)     |   Hecha   |
|  5  | [CRUD de Equipo e Inscripción de equipo](#etapa-5--crud-de-equipo-e-inscripción-de-equipo)                        |   Hecha   |
|  6  | [Listado con filtro y detalle](#etapa-6--listado-con-filtro-y-detalle)                                            |   Hecha   |
|  7  | [Caso de uso: generar el fixture](#etapa-7--caso-de-uso-generar-el-fixture)                                       |   Hecha   |
|  8  | [Documentación para la entrega](#etapa-8--documentación-para-la-entrega)                                          | En curso  |
|  9  | [Seguridad: autenticación y autorización (S-1 a S-6)](#etapa-9--seguridad-autenticación-y-autorización) | Hecha |
| 10  | [Aprobación directa (AD-1 a AD-6)](#etapa-10--aprobación-directa) | En curso |

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
| Torneo 1: Apertura 2026 | En curso. Equipos 1 a 6, con 7 jugadores cada uno (el dorsal 10 es capitán). Fixture de 5 fechas, todos contra todos, una por sábado desde el 19/09: fechas 1 a 3 jugadas (con un WO y un partido suspendido en la fecha 3), fechas 4 y 5 programadas. Desde la etapa 7 el fixture se arma con el mismo algoritmo del caso de uso |
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

**Estado:** Hecha (2026-10-09)

**Objetivo:** el caso de uso con valor de negocio de la regularidad: a partir de los equipos inscriptos en un torneo, generar todas las fechas y partidos "todos contra todos" y cerrar las inscripciones. Usa la información de los CRUD anteriores (torneos, equipos e inscripciones), como pide la cátedra.

### Diseño

| Endpoint | Qué hace | Respuestas |
|:--|:--|:--|
| `POST /torneos/:torneoId/fixture` | Genera el fixture, lo guarda y pasa el torneo a **EnCurso** | 201 con las fechas, 400, 404, 409 |
| `GET /torneos/:torneoId/fixture` | Devuelve las fechas con sus partidos y el equipo libre de cada una | 200 (lista vacía si no se generó), 404 |
| `DELETE /torneos/:torneoId/fixture` | Deshace el fixture y vuelve el torneo a **Inscripcion** | 204, 404 si no tiene fixture, 409 si ya hay actividad |

Cuerpo del `POST`, todo opcional (con `{}` o sin cuerpo genera una rueda sin días asignados):

```json
{ "idaYVuelta": true, "fechaInicio": "2026-11-07T15:00:00-03:00" }
```

Con `fechaInicio`, cada fecha se programa una semana después de la anterior. Las canchas no se asignan en este paso.

### Reglas de negocio

- El torneo tiene que existir y estar en estado **Inscripcion** (409 si el fixture ya fue generado).
- Tiene que haber **al menos dos equipos inscriptos** (409 indicando cuántos hay).
- Al generarse, el torneo pasa a **EnCurso**: desde ese momento las inscripciones quedan cerradas y el torneo no se puede borrar (reglas de las etapas 3 y 5).
- El orden de los equipos se **mezcla** antes de generar, para que los cruces de cada fecha no dependan del orden de inscripción.
- El fixture solo se puede **deshacer** si ningún partido se jugó, se suspendió o tiene jugadores cargados.

### Algoritmo: método del círculo

Está en `generar-fixture.ts`, como función pura con tests.

1. Si la cantidad de equipos es impar, se agrega un "libre": a quien le toca enfrentarlo, no juega esa fecha.
2. Se ubican los equipos en una rueda. En cada fecha se emparejan el primero con el último, el segundo con el anteúltimo, y así.
3. El primer equipo queda fijo y el resto rota una posición para la fecha siguiente.
4. Con n equipos (par) salen **n − 1 fechas** de n/2 partidos, y cada equipo enfrenta a todos los demás **exactamente una vez**. Con n impar salen n fechas, con un libre distinto en cada una.
5. La localía se alterna: cada equipo es local en la mitad de sus partidos, con una diferencia máxima de uno.
6. Con ida y vuelta se repiten las fechas en el mismo orden, con la localía invertida.

Ejemplo con 4 equipos (A, B, C, D), en la rueda `A B C D`:

| Fecha | Rueda | Cruces | Con localía (local–visitante) |
|:-:|:--|:--|:--|
| 1 | A B C D | A con D, B con C | A–D, C–B |
| 2 | A D B C | A con C, D con B | C–A, B–D |
| 3 | A C D B | A con B, C con D | A–B, D–C |

La localía de la primera pareja (la del equipo fijo) se invierte en las fechas pares; la de las demás parejas, según su posición en la rueda. Así cada equipo queda local en 1 o 2 de sus 3 partidos.

### Conceptos

- **Caso de uso:** una operación de negocio que combina varias entidades y reglas, no un CRUD. Equivale a un command con su handler en tu trabajo (`GenerarFixtureCommand`).
- **Transacción interactiva** (`prisma.$transaction(async (tx) => { ... })`): las fechas, los partidos y el cambio de estado del torneo se guardan juntos. Si algo falla, se deshace todo y no queda un fixture a medias. Dentro de la transacción se usa `tx` en lugar de `this.prisma`. Equivale al unit of work con commit o rollback por request de tu trabajo, o a `BeginTransaction`/`Commit` en EF.
- **`createMany`:** inserta muchas filas en una sola operación, como `AddRange` + `SaveChanges`. Para relacionar los partidos con sus fechas sin consultar la base, los ids de las fechas se generan en el código con `randomUUID()`.
- **Pedidos simultáneos:** si llegaran dos `POST` a la vez, los dos podrían pasar las validaciones. La clave única (`torneoId`, `numeroFecha`) impide guardar dos fixtures: el segundo falla con P2002 y responde 409.
- **Fechas en UTC:** SQL Server guarda `datetime2` sin zona horaria, y la API trabaja en UTC. `2026-11-07T15:00:00-03:00` se guarda como 18:00 UTC y se devuelve como `"2026-11-07T18:00:00.000Z"`. **El frontend tiene que mostrarla en hora local.**
- **`it.each`:** corre el mismo test con distintos datos, como `[Theory]` con `[InlineData]` en xUnit.

### Archivos creados

```
src/modules/fixture/
├── dto/generar-fixture.dto.ts     idaYVuelta (booleano) y fechaInicio (ISO 8601), opcionales
├── fixture-vista.ts               Tipos de la respuesta: fechas, partidos y equipo libre
├── fixture.controller.ts          GET, POST y DELETE /torneos/:torneoId/fixture
├── fixture.module.ts              Importa TorneosModule
├── fixture.repository.ts          Consultas y la transacción que guarda o borra el fixture
├── fixture.service.ts             Reglas del caso de uso, mezcla de equipos y armado de la respuesta
├── generar-fixture.ts             Algoritmo del círculo (función pura)
└── generar-fixture.spec.ts        11 tests del algoritmo
```

### Archivos modificados

| Archivo | Cambio |
|:--|:--|
| `src/app.module.ts` | Importa `FixtureModule` |
| `prisma/seed.ts` | Usa `generarFixture` en lugar de su propia copia del algoritmo, y el Apertura empieza el 19/09 para que las fechas programadas queden en el futuro |

### Cómo probarlo

Con el seed cargado, el torneo 2 (Clausura) tiene 4 equipos inscriptos y no tiene fixture:

```powershell
pnpm db:seed
pnpm start:dev
```

```powershell
# Generar con ida y vuelta, empezando el 7 de noviembre
Invoke-RestMethod -Method Post -Uri http://localhost:3000/torneos/2/fixture -ContentType 'application/json' -Body '{"idaYVuelta":true,"fechaInicio":"2026-11-07T15:00:00-03:00"}'

# Ver el fixture y el estado del torneo (estadoTorneo pasa a 2)
Invoke-RestMethod http://localhost:3000/torneos/2/fixture
Invoke-RestMethod http://localhost:3000/torneos/2

# Deshacerlo (vuelve a estadoTorneo 1)
Invoke-RestMethod -Method Delete -Uri http://localhost:3000/torneos/2/fixture
```

Se probaron, sin errores 500:
- Generar con ida y vuelta y con fecha de inicio (6 fechas semanales).
- Generar con cantidad impar (3 equipos: un libre distinto por fecha).
- Generar sin cuerpo.
- Generar dos veces (409).
- Inscribir o borrar el torneo con el fixture generado (409).
- Un solo equipo inscripto (409).
- Cuerpo inválido (400).
- Deshacer, deshacer sin fixture (404) y deshacer con partidos jugados (409).

## Etapa 8 — Documentación para la entrega

**Estado:** En curso (Swagger UI hecho el 2026-10-09)

- `docs/README.md` como entrada, enlazado desde el README principal.
- Modelo de datos en Mermaid.
- Instrucciones de instalación, minutas, links a los PR.

### Swagger UI (adelantado)

Documentación interactiva de la API, generada a partir del código. Equivale a Swashbuckle en ASP.NET Core.

- **Dónde:** `http://localhost:3000/docs` (la especificación OpenAPI en JSON queda en `/docs-json`). Solo se publica **fuera de producción** (`NODE_ENV !== 'production'`).
- **Qué muestra:** todos los endpoints agrupados por tema (Torneos, Equipos, Inscripciones de equipos, Posiciones, Fixture), con sus parámetros y los cuerpos de los pedidos. Desde "Try it out" se puede ejecutar cada endpoint contra la API.
- **Cómo se arma:** el **plugin del CLI** de `@nestjs/swagger` (configurado en `nest-cli.json`) lee al compilar los DTOs, incluidas las reglas de class-validator (obligatorios, `maxLength`, mínimos y máximos, formato URL), y usa el comentario JSDoc de cada método del controller como resumen del endpoint. Por eso esos comentarios describen qué hace el endpoint y no repiten la ruta.
- **Opción mínima:** se documentan los pedidos, no las respuestas. Los endpoints devuelven tipos de Prisma o interfaces, y Swagger solo describe clases. Para la aprobación directa se pueden agregar clases de respuesta y `@ApiResponse` con los códigos posibles.

```powershell
pnpm add @nestjs/swagger
pnpm approve-builds '!@scarf/scarf'
```

El segundo comando **rechaza** el script de instalación de `@scarf/scarf`, un paquete de telemetría que trae Swagger UI y que envía estadísticas de descarga. No hace falta para que funcione. Queda registrado como `false` en `pnpm-workspace.yaml`.

| Archivo | Cambio |
|:--|:--|
| `src/common/documentacion/configurar-swagger.ts` | Nuevo: título, descripción y versión de la API, y publicación en `/docs` |
| `src/main.ts` | Llama a `configurarSwagger` cuando no es producción |
| `nest-cli.json` | Plugin `@nestjs/swagger` con `classValidatorShim` (lee class-validator) e `introspectComments` (lee los JSDoc) |
| Controllers | `@ApiTags(...)` para agrupar los endpoints, y comentarios JSDoc descriptivos |
| `src/app.controller.ts` | `@ApiExcludeController()`: el "Hello World" de ejemplo no aparece en la documentación |
| `pnpm-workspace.yaml` | `'@scarf/scarf': false` |


## Etapa 9 — Seguridad: autenticación y autorización

**Estado:** Hecha (2026-11-10)

Login y permisos por rol. La cátedra los pide para la aprobación directa, pero se hacen como etapa propia y **antes** del resto de la aprobación directa: así los endpoints y pantallas nuevos (jugadores, canchas, carga de resultados) nacen protegidos y no hay que volver sobre ellos. Los decoradores `@Publico()` y `@Roles(...)` ya están en todos los endpoints desde la etapa 4; esta etapa los activa.

El diseño (mecanismo, roles, permisos y medidas) está decidido en [seguridad.md](seguridad.md). Las subetapas tienen la misma numeración en los planes del backend y del frontend.

| Subetapa | Qué incluye | Backend | Frontend | Estado |
|:-:|:--|:-:|:-:|:-:|
| S-1 | Usuarios, contraseñas con Argon2id y usuarios de prueba (uno por rol) | Sí | No | Hecha |
| S-2 | Login con JWT, límite de intentos y datos del usuario actual | Sí | No | Hecha |
| S-3 | Protección de la API: guard global, guard de roles, mensajes 401 y 403, Swagger con token | Sí | No | Hecha |
| S-4 | Login, sesión y envío del token desde el cliente de API | No | Sí | Hecha |
| S-5 | Pantallas, menú y acciones según el rol; sesión vencida (401) y sin permiso (403) | No | Sí | Hecha |
| S-6 | Gestión de usuarios y roles por el administrador | Sí | Sí | Hecha |
| S-7 | Tokens de refresco con rotación y cookie `httpOnly`; token de acceso de 15 minutos solo en memoria | Sí | Sí | Hecha |

### S-1 — Usuarios y contraseñas

**Estado:** Hecha (2026-11-09)

#### Corrección previa del modelo: foto de perfil opcional

`Usuario.fotoPerfilURL` era obligatoria, y un usuario creado por el administrador o por el seed no tiene foto. Pasó a opcional, igual que `Equipo.escudoURL` en la etapa 5.

```powershell
# 1. Crear la migración contra la base LOCAL (migrate dev necesita una base "sombra" temporal).
#    Se usa la cadena local solo para este comando, sin tocar el .env.
pnpm exec prisma migrate dev --name usuario_foto_opcional
# 2. Aplicarla en Azure (la base del .env).
pnpm db:deploy
```

La migración es `ALTER TABLE [dbo].[Usuario] ALTER COLUMN [fotoPerfilURL] VARCHAR(500) NULL`. También se marcó como `null` en el diagrama (`modelo-de-datos.drawio` y `.png`) y en el Mermaid de la proposal.

> **Base pausada:** la primera vez, `db:deploy` falló con "Database 'ligahub' ... is not currently available": la base sin servidor estaba pausada. La API espera hasta 60 segundos (`connectTimeout`), pero el motor de migraciones de Prisma no. Se resuelve reintentando a los pocos segundos.

#### Instalación

```powershell
pnpm add @node-rs/argon2
```

Viene precompilado para cada plataforma: no compila nada al instalarse ni hay que aprobar scripts en `pnpm-workspace.yaml`.

#### Archivos

| Archivo | Qué es |
|:--|:--|
| `src/config/configuracion.ts` | Lee y valida el `.env` al arrancar: `DATABASE_URL`, `JWT_SECRET` (al menos 32 caracteres) y `JWT_DURACION` (por defecto `8h`) |
| `src/config/configuracion.spec.ts` | Tests de la validación |
| `src/main.ts` | Llama a `leerConfiguracion()` antes de crear la aplicación |
| `src/modules/usuarios/contrasenias.service.ts` | Hash y verificación con Argon2id |
| `src/modules/usuarios/contrasenias.service.spec.ts` | Tests del hash |
| `src/modules/usuarios/usuario.ts` | Tipos `UsuarioConRoles` (sin hash) y `UsuarioConCredenciales` (con hash, solo para el login), y `normalizarEmail` |
| `src/modules/usuarios/usuarios.repository.ts` | `buscarConCredenciales(email)` y `obtenerPorId(id)` |
| `src/modules/usuarios/usuarios.module.ts` | Exporta el repositorio y el servicio de contraseñas para la autenticación (S-2) |
| `src/app.module.ts` | Importa `UsuariosModule` |
| `prisma/seed.ts` | Un usuario de prueba por rol |
| `prisma/schema.prisma` y la migración `usuario_foto_opcional` | `fotoPerfilURL` opcional |
| `.env.example` | `JWT_SECRET`, `JWT_DURACION` y `SEED_CONTRASENIA` |

#### Conceptos

- **Argon2id:** función de hash pensada para contraseñas: es lenta y usa mucha memoria a propósito, para que probar millones de contraseñas sea caro. Se usan los parámetros mínimos que recomienda [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): 19 MiB de memoria, 2 pasadas y 1 hilo. Equivale a `PasswordHasher<T>` de Identity, que usa PBKDF2.
- **Formato PHC del hash:** `$argon2id$v=19$m=19456,t=2,p=1$<sal>$<hash>`. Guarda el algoritmo, los parámetros y una **sal** aleatoria distinta por contraseña: la misma contraseña da hashes distintos, y no hace falta guardar nada más. Si en el futuro se suben los parámetros, los hashes viejos se siguen verificando.
- **El hash nunca sale en una respuesta:** el repositorio tiene un `select` con los campos públicos. Solo `buscarConCredenciales` agrega `contraseniaHash`, y lo usa únicamente el login. Son tipos distintos (`UsuarioConRoles` y `UsuarioConCredenciales`), así que TypeScript avisa si se intenta devolver el que tiene el hash.
- **Emails normalizados:** se guardan y se buscan sin espacios y en minúsculas.
- **Validación de la configuración al arrancar:** es el `ValidateOnStart` de las opciones de ASP.NET Core. Con un `JWT_SECRET` corto, la API no arranca y muestra:

  ```
  Error: Configuración inválida en .env:
  - JWT_SECRET debe tener al menos 32 caracteres.
  ```
- **Secretos fuera del repositorio:** `JWT_SECRET` y `SEED_CONTRASENIA` están solo en `.env`. Se generaron con valores aleatorios (`crypto.randomBytes`). El `.env.example` muestra cómo generar el secreto, sin el valor.

#### Usuarios de prueba (seed)

| Email | Rol | Jugador asociado |
|:--|:--|:--|
| `administrador@ligahub.test` (id 1) | Administrador | — |
| `asistente@ligahub.test` (id 2) | Asistente | — |
| `jugador@ligahub.test` (id 3) | Jugador | Matías Díaz, capitán de Los Halcones (10) |

La contraseña de los tres es la de `SEED_CONTRASENIA` en el `.env`. Si falta o tiene menos de 12 caracteres, el seed no se ejecuta.

**Un hash por usuario:** al principio el seed calculaba el hash una sola vez y lo reutilizaba para los tres usuarios, así que en la base quedaban idénticos. El login funcionaba igual, pero no es como trabaja la API, donde cada alta genera su propio hash con una sal aleatoria. Se corrigió para generar uno por usuario: con la misma contraseña, los tres hashes quedan distintos. Equivale a llamar a `PasswordHasher.HashPassword` una vez por usuario en ASP.NET Core Identity.

#### Cómo se probó

- Tests unitarios: pasan los 29 (los 18 anteriores más 7 de la configuración y 4 del hash).
- Seed en Azure y verificación con un script temporal que usa el mismo repositorio y el mismo servicio que usará el login:
  - Los tres usuarios tienen su rol y el hash empieza con `$argon2id$v=19$m=19456,t=2,p=1`.
  - La contraseña del `.env` verifica; una incorrecta no.
  - El email se encuentra aunque venga con mayúsculas y espacios.
  - `obtenerPorId` no incluye el hash.
- La API arranca con el `.env` correcto y no arranca con un `JWT_SECRET` corto.
- El test end-to-end sigue pasando.

### S-2 — Login

**Estado:** Hecha (2026-11-09)

#### Instalación

```powershell
pnpm add "@nestjs/jwt@12.0.3" "@nestjs/throttler@6.7.1"
```

Versiones fijas. La última de `@nestjs/jwt` (12.0.4) había salido hacía tres días; por precaución se usa la anterior, que ya llevaba casi un mes publicada.

#### Endpoints

| Método y ruta | Acceso | Qué hace | Respuestas |
|:--|:--|:--|:--|
| `POST /auth/login` | Público, con límite de intentos | Recibe `{ email, contrasenia }` y devuelve `{ token, expira, usuario }` | 200; 400 si el cuerpo es inválido; 401 "Credenciales inválidas."; 429 si se superan los intentos |
| `GET /auth/yo` | Con token | Devuelve el usuario de la sesión (id, email, foto, jugador asociado y roles), leído de la base | 200; 401 sin token, con token vencido o adulterado |

#### Archivos

| Archivo | Qué es |
|:--|:--|
| `src/modules/auth/auth.module.ts` | Configura `JwtModule` (secreto y duración desde `.env`) y `ThrottlerModule` (5 intentos por minuto) |
| `src/modules/auth/auth.controller.ts` | `POST /auth/login` y `GET /auth/yo` |
| `src/modules/auth/auth.service.ts` | Verifica las credenciales y firma el token |
| `src/modules/auth/autenticacion.guard.ts` | Exige un token válido en `Authorization: Bearer` y deja el usuario en el pedido. Respeta `@Publico()` |
| `src/modules/auth/usuario-actual.decorator.ts` | `@UsuarioActual()`: el usuario de la sesión como parámetro del controller |
| `src/modules/auth/contenido-token.ts` | Qué lleva el token: `sub` (id), `email` y `roles` |
| `src/modules/auth/dto/iniciar-sesion.dto.ts` | Validación del cuerpo del login |
| `src/modules/auth/auth.service.spec.ts` | Tests unitarios del servicio |
| `test/auth.e2e-spec.ts` | Test de integración del login contra la API completa |

#### Conceptos

- **JWT (JSON Web Token):** tres partes en base64 separadas por puntos: encabezado, contenido y firma. El contenido (`{"sub":2,"email":"asistente@ligahub.test","roles":[2],"iat":...,"exp":...}`) **se puede leer sin la clave**: va firmado, no cifrado. Por eso nunca lleva datos sensibles. La firma (HMAC con `JWT_SECRET`) impide modificarlo: un token adulterado se rechaza. `exp` es el vencimiento, 8 horas después de `iat` (emisión).
- **API sin estado:** la API no guarda sesiones. Cada pedido trae su token y el guard lo verifica con la clave. Es el esquema `JwtBearer` de ASP.NET Core.
- **Guard (`CanActivate`):** decide si un pedido puede llegar al controller; es un filtro de autorización de ASP.NET Core. `AutenticacionGuard` se aplica por ahora solo a `GET /auth/yo` con `@UseGuards`; en S-3 pasa a ser global.
- **`@UsuarioActual()`:** decorador de parámetro que entrega el contenido del token. Equivale a leer `User` (el `ClaimsPrincipal`) en un controller.
- **`/auth/yo` lee el usuario de la base** y no solo del token: si al usuario le cambiaron los roles o lo borraron, se ve enseguida.
- **Mensaje genérico:** para un email inexistente y para una contraseña incorrecta la respuesta es la misma ("Credenciales inválidas."). Si fueran distintas, el login serviría para averiguar qué emails están registrados.
- **Mismo tiempo de respuesta:** con un email inexistente igual se verifica la contraseña, contra un hash ficticio. Si no, esa respuesta sería casi instantánea (no hay hash que calcular) y el tiempo delataría que el email no existe.
- **Límite de intentos (`@nestjs/throttler`):** 5 intentos por minuto por IP en el login; el sexto responde 429 "Demasiados intentos de inicio de sesión. Esperá un minuto y volvé a intentar.", aunque la contraseña sea correcta. Frena los ataques de fuerza bruta. Equivale al middleware de *rate limiting* de ASP.NET Core. Los contadores están en memoria: se reinician al reiniciar la API.
- **`registerAsync`:** la configuración del JWT se lee cuando se crea el módulo, con el `.env` ya cargado y validado, y no al importar el archivo.

> **Para el deploy (AD-6):** detrás del proxy de Azure, la IP del cliente llega en el encabezado `X-Forwarded-For`. Habrá que habilitar `trust proxy` en Express para que el límite se aplique por cliente y no a todos juntos.

#### Cómo se probó

- **Unitarios** (`auth.service.spec.ts`, con un repositorio falso en memoria): el token trae id, email y roles; vence a las 8 horas; contraseña incorrecta y email inexistente dan 401 con el mismo mensaje; `obtenerUsuarioActual` no devuelve el hash y da 401 si el usuario no existe. En total pasan 35.
- **Integración** (`test/auth.e2e-spec.ts`, la API completa contra Azure con el seed cargado):
  - Login correcto: 200 con token y usuario, sin el hash.
  - Contraseña incorrecta y email inexistente: 401 con el mismo mensaje.
  - Email mal formado: 400 con el detalle en el campo `email`.
  - `GET /auth/yo`: 200 con token, 401 sin token ("Tenés que iniciar sesión.") y 401 con un token adulterado.
  - Sexto intento en un minuto: 429, aunque la contraseña sea correcta.
- **A mano:** login con ` Asistente@LigaHub.test` (mayúsculas y un espacio): 200, y el contenido del token decodificado muestra `sub`, `email`, `roles`, `iat` y `exp`. Swagger muestra los dos endpoints en el grupo "Autenticación".

### S-3 — Protección de la API

**Estado:** Hecha (2026-11-09)

Los decoradores `@Publico()` y `@Roles(...)` estaban en todos los endpoints desde la etapa 4. Desde esta subetapa, dos **guards globales** los aplican.

#### Cómo queda cada endpoint

| Endpoints | Acceso |
|:--|:--|
| Consultas: torneos, equipos, inscripciones, posiciones, detalle del equipo, fixture | Público (`@Publico()`) |
| `POST /auth/login` | Público, con límite de intentos |
| `GET /auth/yo` | Cualquier usuario con sesión (sin `@Roles`) |
| Altas, modificaciones y bajas; generar y deshacer el fixture | Solo Administrador (`@Roles(Rol.Administrador)`) |

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/auth/roles.guard.ts` | Nuevo: compara los roles del token con los de `@Roles(...)`; 403 "No tenés permiso para realizar esta acción." |
| `src/modules/auth/auth.module.ts` | Registra `AutenticacionGuard` y `RolesGuard` como `APP_GUARD` (globales, en ese orden) |
| `src/modules/auth/auth.controller.ts` | `GET /auth/yo` ya no necesita `@UseGuards`: lo cubre el guard global |
| `src/common/seguridad/roles.decorator.ts` | `@Roles(...)` además marca el endpoint en Swagger: candado y respuestas 401 y 403 con el rol requerido |
| `src/common/documentacion/configurar-swagger.ts` | Esquema de token Bearer (botón Authorize) y `persistAuthorization` |
| `src/app.controller.ts` | `@Publico()` en el "Hello World" de ejemplo, que si no pasaba a pedir sesión |
| `src/modules/auth/roles.guard.spec.ts` | Tests unitarios del guard de roles |
| `test/permisos.e2e-spec.ts` | Test de integración de los permisos con cada rol |

#### Conceptos

- **`APP_GUARD`:** registrar un guard con este token lo hace global, para todos los endpoints de la aplicación. Equivale a `options.Filters.Add(new AuthorizeFilter())` o a una política de autorización por defecto en ASP.NET Core. Se registra en el `AuthModule` (y no en `main.ts` con `app.useGlobalGuards`) porque así el guard puede recibir dependencias por inyección (`JwtService`, `Reflector`).
- **Orden de los guards:** se ejecutan en el orden en que se registran. Primero `AutenticacionGuard` verifica el token y deja el usuario en el pedido; después `RolesGuard` usa ese usuario. Desde S-6, los roles de ese usuario salen de la base y no del token. El `ThrottlerGuard` del login es local (`@UseGuards`) y corre después de los globales.
- **Cerrado por defecto:** un endpoint nuevo sin decorador exige sesión. Si alguien se olvida de declarar el permiso, queda cerrado, no abierto.
- **`Reflector.getAllAndOverride`:** lee los metadatos que dejan `@Publico()` y `@Roles(...)`, primero en el método y si no en el controller. Es la forma en que los guards "ven" los atributos, como `IAuthorizationRequirement` leyendo `[Authorize]`.
- **401 y 403:** 401 (no autenticado) es "no sé quién sos": falta el token, está vencido o es inválido. 403 (sin permiso) es "sé quién sos, pero tu rol no alcanza". El frontend los trata distinto: el 401 lleva al login y el 403 muestra un mensaje.
- **`applyDecorators`:** combina varios decoradores en uno. `@Roles(...)` junta el metadato para el guard con los decoradores de Swagger, así que el permiso y su documentación no se pueden desincronizar.

#### Cómo se probó

- **Unitarios** (`roles.guard.spec.ts`, 7 casos): endpoint público sin usuario; endpoint sin `@Roles` con cualquier rol; uno de los roles pedidos alcanza; usuario con varios roles; 403 si no tiene ninguno y si no hay usuario. En total pasan 42.
- **Integración** (`test/permisos.e2e-spec.ts`, contra Azure con los usuarios del seed):
  - Sin sesión: las consultas responden 200 y `POST /torneos` responde 401 "Tenés que iniciar sesión.".
  - Asistente y Jugador: crear un torneo, borrar un equipo y generar el fixture responden 403, sin llegar a ejecutarse.
  - Administrador: crea un torneo (201) y lo borra (204).
  - `GET /auth/yo`: 200 con los tres roles.

  Con los tests del login (S-2) son 12 de integración. **Cubren el test de integración que pide la cátedra.**
- **Swagger:** el botón Authorize aparece arriba; los 11 endpoints de escritura tienen candado y dicen "Requiere el rol Administrador."; las consultas y el login no tienen candado.

> **Efecto en el frontend:** hasta S-4, las pantallas que crean, modifican o borran reciben 401 "Tenés que iniciar sesión." porque todavía no envían el token. Las consultas (inicio, posiciones, fixture) siguen funcionando.

### S-6 — Gestión de usuarios (backend)

**Estado:** Hecha (2026-11-10)

CRUD de usuarios para el Administrador: alta con contraseña y roles, modificación de email, roles y jugador asociado, cambio de contraseña y baja. Además, un listado de jugadores para elegir cuál se asocia a un usuario con rol Jugador.

#### Endpoints

Todos con `@Roles(Rol.Administrador)` a nivel de controller.

| Método y ruta | Qué hace | Respuesta |
|:--|:--|:-:|
| `GET /usuarios` | Lista los usuarios, por email, con sus roles y su jugador asociado | 200 |
| `GET /usuarios/:id` | Un usuario | 200 o 404 |
| `POST /usuarios` | Crea un usuario con contraseña y roles | 201 |
| `PATCH /usuarios/:id` | Modifica email, roles o jugador asociado (`jugadorId: null` lo quita) | 200 |
| `PATCH /usuarios/:id/contrasenia` | Reemplaza la contraseña | 204 |
| `DELETE /usuarios/:id` | Borra el usuario y sus roles | 204 |
| `GET /jugadores` | Lista los jugadores (id, DNI, nombre) con el usuario asociado, si lo tienen | 200 |

Nunca se devuelve la contraseña ni su hash: el repositorio selecciona solo los campos públicos.

#### Reglas de negocio

| Regla | Respuesta |
|:--|:--|
| Email repetido (sin importar mayúsculas) | 409 "Ya existe un usuario con el email ..." |
| Rol Jugador sin jugador asociado | 400 en el campo `jugadorId` |
| Jugador asociado sin el rol Jugador | 400 en el campo `jugadorId` |
| El jugador no existe | 404 "No existe el jugador X." |
| El jugador ya tiene otro usuario | 409 "Ese jugador ya tiene un usuario asociado." |
| El administrador se quita su propio rol de Administrador | 409: el sistema podría quedar sin administradores |
| El administrador borra su propio usuario | 409 "No podés borrar tu propio usuario." |
| Contraseña de menos de 12 caracteres | 400 (DTO) |

Al modificar, si se quita el rol Jugador y no se envía `jugadorId`, el jugador se desasocia solo.

#### Cambio en el guard de autenticación

`AutenticacionGuard` ahora busca el usuario en la base en cada pedido y toma los roles de ahí, no del token. Antes, un cambio de rol o una baja recién se notaban cuando vencía el token (hasta 8 horas). Ahora:

- Un cambio de rol rige desde el pedido siguiente, con el mismo token.
- El token de un usuario borrado responde 401 "El usuario de la sesión ya no existe. Iniciá sesión de nuevo.".

El costo es una consulta por clave primaria por pedido autenticado, que es despreciable para esta aplicación. Es lo que hace ASP.NET Core Identity con `SecurityStampValidator`, que revalida la cookie contra la base.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/usuarios/usuario.ts` | Tipos `UsuarioConRoles` (con `jugador`), `UsuarioConCredenciales` y `DatosUsuario` |
| `src/modules/usuarios/usuarios.repository.ts` | Consultas (`obtenerTodos`, `existeConEmail`, `jugadorTieneUsuario`, `existeJugador`) y escrituras (`crear`, `modificar` y `borrar` en transacción, `cambiarContrasenia`) |
| `src/modules/usuarios/usuarios.service.ts` | Nuevo: casos de uso y reglas de negocio |
| `src/modules/usuarios/usuarios.controller.ts` | Nuevo: los 6 endpoints de `/usuarios` |
| `src/modules/usuarios/dto/crear-usuario.dto.ts`, `modificar-usuario.dto.ts`, `cambiar-contrasenia.dto.ts` | Nuevos: validación de entrada |
| `src/modules/usuarios/usuarios.module.ts` | Registra controller y servicio |
| `src/modules/jugadores/*` | Nuevo módulo: `GET /jugadores` (el CRUD completo se agregó en AD-2) |
| `src/modules/auth/autenticacion.guard.ts` | Lee el usuario y sus roles de la base en cada pedido |
| `src/app.module.ts` | Importa `JugadoresModule` |
| `src/modules/usuarios/usuarios.service.spec.ts` | Nuevo: tests unitarios del servicio con un repositorio en memoria |
| `test/usuarios.e2e-spec.ts` | Nuevo: test de integración del ciclo completo |

#### Conceptos

- **`@IsIn` y no `@IsEnum` para los roles:** un `enum` numérico de TypeScript también contiene los nombres (`Rol[1] === 'Administrador'`), así que `@IsEnum` aceptaría `"Administrador"` además de `1`. `VALORES_ROL` filtra solo los números.
- **Reemplazo de roles en transacción:** `modificar` borra los `UsuarioRol` y crea los nuevos dentro de `$transaction`, como un `SaveChanges` que agrupa el `RemoveRange` y el `AddRange`. Si algo falla, no queda un usuario sin roles.
- **`@UsuarioActual()`:** el controller recibe el id de quien hace el pedido para aplicar las reglas sobre el propio usuario. Es el `User.FindFirst(ClaimTypes.NameIdentifier)` de un controller de ASP.NET Core.
- **Validación en dos niveles**, como en el trabajo: los DTO validan forma y largo (FluentValidation); el servicio valida lo que necesita la base o el contexto (unicidad, existencia, reglas sobre el propio usuario), como el `ValidarCreacion` de la entidad.
- **Repositorio falso en el test unitario:** `RepositorioEnMemoria` implementa solo los métodos que usa el servicio. Equivale a un fake hecho a mano en lugar de un mock de Moq.

#### Cómo se probó

- **Unitarios** (`usuarios.service.spec.ts`, 10 casos): el alta guarda el hash Argon2id y normaliza el email; 409 por email repetido; los dos 400 de `jugadorId`; 404 y 409 del jugador; el administrador no puede quitarse su rol pero sí quitárselo a otro; quitar el rol Jugador desasocia el jugador; el cambio de contraseña reemplaza el hash; no se puede borrar el propio usuario. En total pasan 52.
- **Integración** (`test/usuarios.e2e-spec.ts`, contra Azure):
  - Solo el Administrador lista usuarios y jugadores; el Jugador recibe 403. El listado no contiene hashes.
  - 400 en `jugadorId` y 409 por email repetido; 409 al borrarse a sí mismo.
  - Ciclo completo: alta, login del usuario nuevo, cambio de rol que rige con el mismo token, cambio de contraseña (la anterior deja de servir) y baja (el token del usuario borrado responde 401).

  En total pasan 16 de integración.
- **Swagger:** los 7 endpoints nuevos aparecen con candado y respuestas 401 y 403.

### S-7 — Tokens de refresco y cookie `httpOnly`

**Estado:** Hecha (2026-11-10)

Mejora de la sesión de S-2. Antes, el login devolvía un token de 8 horas y el frontend lo guardaba en `sessionStorage`, donde un ataque XSS podía leerlo. Ahora hay dos tokens: uno de acceso de 15 minutos, que el frontend guarda solo en memoria, y uno de refresco que viaja en una cookie `httpOnly`. El diseño completo está en [seguridad.md](seguridad.md#tokens-de-refresco-s-7).

#### Endpoints

| Método y ruta | Acceso | Qué hace |
|:--|:--|:--|
| `POST /auth/login` | Público | Igual que antes, y además deja el token de refresco en la cookie `ligahub_refresco` |
| `POST /auth/refrescar` | Público (usa la cookie) | Devuelve otro token de acceso y reemplaza la cookie (rotación). Si la cookie no sirve, la borra y responde 401 |
| `POST /auth/cerrar-sesion` | Público (usa la cookie) | Revoca la sesión y borra la cookie. 204 |

`refrescar` y `cerrar-sesion` son públicos porque el token de acceso puede estar vencido: lo que identifica la sesión es la cookie.

#### Modelo de datos

Tabla nueva `TokenRefresco` (migración `20261110190000_tokens_refresco`):

| Columna | Qué es |
|:--|:--|
| `id` | `uniqueidentifier` |
| `usuarioId` | FK a `Usuario` |
| `familiaId` | Identifica la sesión: el login crea una familia y cada refresco agrega un token a la misma |
| `tokenHash` | SHA-256 del token, en hexadecimal (`char(64)`, único). El token no se guarda |
| `fechaHoraCreacion` | Cuándo se emitió |
| `fechaHoraVencimiento` | Fin de la sesión. El token nuevo hereda el del anterior: refrescar no alarga la sesión |
| `fechaHoraRevocacion` | Cuándo se usó o se revocó. `NULL`: vigente |

#### Pasos

```powershell
pnpm add cookie-parser@1
pnpm add -D @types/cookie-parser@1

# Migración sin base "sombra": compara el schema anterior (de git) con el nuevo.
git show HEAD:prisma/schema.prisma > schema-anterior.prisma
pnpm exec prisma migrate diff --from-schema schema-anterior.prisma --to-schema prisma/schema.prisma --script -o prisma/migrations/20261110190000_tokens_refresco/migration.sql
pnpm db:deploy
```

`prisma migrate diff` con dos archivos de schema no necesita ninguna base, así que la migración se puede crear sin la base local ni la base "sombra" de `migrate dev`. Es como generar el script de una migración de EF con `Script-Migration` en lugar de `Add-Migration` contra una base.

En el `.env` hay que cambiar `JWT_DURACION=8h` por `15m` (o borrar la línea: el valor por defecto ahora es `15m`).

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `prisma/schema.prisma` y la migración `tokens_refresco` | Modelo `TokenRefresco` |
| `src/config/configuracion.ts` | `JWT_DURACION` por defecto `15m`; nuevas `REFRESCO_DURACION` (por defecto `7d`) y `COOKIE_SAMESITE` (por defecto `strict`); `aMilisegundos` |
| `src/modules/auth/tokens-refresco.repository.ts` | Nuevo: buscar por hash, crear, rotar en transacción, revocar la familia y borrar los vencidos |
| `src/modules/auth/cookie-refresco.ts` | Nuevo: opciones de la cookie (`HttpOnly`, `Secure`, `SameSite`, `Path=/auth`), escribirla, borrarla y leerla |
| `src/modules/auth/auth.service.ts` | `iniciarSesion` crea la sesión; nuevos `refrescarSesion` (rotación y detección de reutilización) y `cerrarSesion` |
| `src/modules/auth/auth.controller.ts` | Escribe la cookie con `@Res({ passthrough: true })`; endpoints `refrescar` y `cerrar-sesion` |
| `src/modules/auth/auth.module.ts` | Registra el repositorio, la configuración de la sesión y `cookie-parser` para las rutas de `/auth` |
| `src/main.ts` | CORS con `credentials: true` |
| `src/modules/usuarios/usuarios.repository.ts` | Cambiar la contraseña revoca las sesiones del usuario; borrarlo borra sus tokens |
| `prisma/seed.ts` | Borra los tokens antes que los usuarios |
| `.env.example` | `JWT_DURACION=15m`, `REFRESCO_DURACION` y `COOKIE_SAMESITE` |
| `src/modules/auth/auth.service.spec.ts`, `src/config/configuracion.spec.ts`, `test/auth.e2e-spec.ts` | Tests nuevos (ver abajo) |

#### Conceptos

- **Token de acceso y token de refresco:** el de acceso es el que autoriza cada pedido; dura poco para que, si se filtra, sirva poco. El de refresco no autoriza nada: solo sirve para pedir otro de acceso, y viaja solo a `/auth`. En ASP.NET Core Identity es la combinación de `BearerTokenOptions.BearerTokenExpiration` y `RefreshTokenExpiration` de los endpoints de Identity.
- **No es un JWT:** el token de refresco es un valor aleatorio. No necesita llevar datos, porque la base dice a quién pertenece y si sigue vigente, y así se puede revocar (un JWT es válido hasta que vence).
- **Rotación y familia:** cada uso marca el token como usado y emite otro con el mismo `familiaId`. Si alguien presenta uno ya usado, se revoca la familia entera.
- **`@Res({ passthrough: true })`:** da acceso al `Response` de Express para escribir la cookie, sin que Nest deje de serializar lo que devuelve el método. Equivale a `Response.Cookies.Append(...)` y después `return Ok(...)`.
- **Middleware por módulo (`NestModule.configure`):** `cookie-parser` se aplica solo a `AuthController`. Se registra en el módulo y no en `main.ts` para que también funcione en los tests de integración, que no pasan por `main.ts`. Es un `app.UseWhen(...)` limitado a una ruta.
- **Proveedor de configuración (`CONFIGURACION_SESION`):** el servicio y el controller reciben la duración y el `SameSite` por inyección, leídos del `.env` en una factory. Equivale a `IOptions<ConfiguracionSesion>`. En el test unitario se pasan valores fijos.
- **CORS con credenciales:** para que el navegador envíe y guarde la cookie en un pedido a otro origen, el frontend usa `credentials: 'include'` y la API responde `Access-Control-Allow-Credentials: true`. Con credenciales, el origen permitido no puede ser el comodín `*`.
- **`Secure` en localhost:** los navegadores tratan `http://localhost` como contexto seguro y aceptan cookies `Secure` aunque no haya HTTPS.

#### Cómo se probó

- **Unitarios** (`auth.service.spec.ts` con repositorios en memoria y `configuracion.spec.ts`):
  - El login emite un token de acceso de 15 minutos y uno de refresco de 7 días, y guarda solo el hash.
  - Con credenciales incorrectas no se crea ninguna sesión.
  - Refrescar entrega un token nuevo con el mismo vencimiento y marca el anterior como usado.
  - Reutilizar un token ya usado responde 401 y deja sin efecto también el vigente.
  - Sin token, con uno inexistente o con la sesión vencida, 401.
  - Cerrar la sesión impide refrescarla; sin token no falla.
  - Valores por defecto y validación de `REFRESCO_DURACION` y `COOKIE_SAMESITE`; `aMilisegundos`.

  En total pasan 122.
- **Integración** (`test/auth.e2e-spec.ts`, contra Azure):
  - La cookie del login es `HttpOnly`, `Secure`, `SameSite=Strict` y `Path=/auth`, y su valor no aparece en el cuerpo.
  - Refrescar devuelve un token que sirve para `GET /auth/yo` y otra cookie; reutilizar la anterior responde 401, borra la cookie y revoca también la nueva.
  - Refrescar sin cookie responde 401; cerrar la sesión responde 204, borra la cookie y después refrescar responde 401.

  Pasan los 9 de `auth.e2e-spec.ts`. En la suite completa pasaron 25 de 26: falló "solo el Administrador lista usuarios y jugadores", que espera un solo jugador con usuario. En la base había un usuario creado a mano (`jugador2@ligahub.test`) que no es del seed; no tiene relación con este cambio.
- **End-to-end del frontend:** ver S-7 en el plan del frontend.

## Etapa 10 — Aprobación directa

**Estado:** En curso (AD-1 a AD-5 hechas)

Subetapas con la misma numeración en los planes del backend y del frontend. Requiere la etapa de seguridad: los endpoints y pantallas nuevos se protegen por rol desde el principio. El orden tiene un motivo:
- **AD-1 se adelantó:** es un requisito de regularidad.
- **AD-2 antes que AD-4:** para cargar un resultado hacen falta jugadores inscriptos.
- **Los tests de cada subetapa se escriben en la misma subetapa.** AD-5 cubre los que pide la cátedra y no corresponden a una en particular.

| Subetapa | Qué incluye | Backend | Frontend | Estado |
|:-:|:--|:-:|:-:|:-:|
| AD-1 | Base de datos en la nube (Azure SQL). **También es requisito de regularidad** | Sí | No | Hecha |
| AD-2 | CRUD de Jugador e Inscripción de jugador | Sí | Sí | Hecha |
| AD-3 | CRUD de Predio y Cancha, y asignar cancha y horario a los partidos | Sí | Sí | Hecha |
| AD-4 | Caso de uso: cargar el resultado de un partido | Sí | Sí | Hecha |
| AD-5 | Tests que faltan | Sí | Sí | Hecha |
| AD-6 | Ambientes y deploy | Sí | Sí | Pendiente |
| Extra | Fotos de perfil en Azure Blob Storage (Azurite en desarrollo): archivo, pegar o dirección de internet | Sí | Sí | Hecha |
| Voluntario | Goleadores y suspensiones (alcance adicional voluntario de la proposal) | Sí | Sí | Hecha |

### AD-1 — Base de datos en la nube

**Estado:** Hecha (2026-11-09)

**Por qué:** el FAQ de la cátedra exige que la base sea un servicio que "no debe requerir ejecutarse en local". Es un requisito de **regularidad**, no solo de la aprobación directa.

**Dónde:** Azure SQL Database con la **oferta gratuita** (100.000 segundos de vCore y 32 GB por mes; al llegar al límite la base se pausa hasta el mes siguiente, sin cobrar).

| Dato | Valor |
|:--|:--|
| Servidor | `ligahub.database.windows.net` |
| Base | `ligahub` |
| Grupo de recursos | `rg-ligahub` |
| Modelo | Sin servidor (serverless), General Purpose |
| Intercalación | `Modern_Spanish_CI_AS`, la misma que la base local |
| Usuario de la aplicación | `ligahub_app`: usuario de la base (no del servidor) con `db_owner` |
| Administrador | `ligahub_admin`: solo para administrar desde SSMS o el portal |

#### Pasos

1. **En el portal de Azure (Mateo):** crear la base con la oferta gratuita, el servidor con autenticación de SQL, acceso público con la IP propia habilitada y "Permitir servicios de Azure" (lo necesitará el deploy de AD-6).
2. **Usuario de la aplicación.** Conectarse con SSMS como `ligahub_admin` a la base `ligahub` (en Opciones → Propiedades de conexión → Conectar con la base de datos: `ligahub`, porque en Azure SQL no se puede cambiar de base con `USE`) y ejecutar:

   ```sql
   CREATE USER ligahub_app WITH PASSWORD = '...';
   ALTER ROLE db_owner ADD MEMBER ligahub_app;
   ```

   Es un **usuario contenido**: existe solo dentro de la base y no necesita un login en el servidor. Equivale al login `ligahub_app` de la base local.
3. **Cadena de conexión en `.env`:**

   ```
   DATABASE_URL="sqlserver://ligahub.database.windows.net:1433;database=ligahub;user=ligahub_app;password={...};encrypt=true;trustServerCertificate=false;connectTimeout=60000"
   ```

   - `trustServerCertificate=false`: Azure tiene un certificado válido y se verifica (en local era `true` porque el certificado es autofirmado).
   - `password={...}`: las llaves permiten que la contraseña tenga `;` o `=`.
   - `connectTimeout=60000`: la base sin servidor se pausa sola después de un rato sin uso, y el primer pedido después de una pausa espera mientras se reactiva. El valor va en **milisegundos**: el adaptador `@prisma/adapter-mssql` lo pasa sin convertir al driver `mssql` (verificado en su código).
4. **Crear las tablas y cargar los datos:**

   ```powershell
   pnpm exec prisma migrate status   # verifica la conexión y lista las migraciones pendientes
   pnpm db:deploy                    # aplica las migraciones (prisma migrate deploy)
   pnpm db:seed                      # carga los datos de ejemplo
   ```

   Se usa `migrate deploy` y no `migrate dev`: aplica las migraciones que ya existen, sin generar nuevas ni pedir una base "sombra". Es el comando para bases compartidas o de producción, como `Update-Database` con las migraciones ya creadas en EF Core.

> **Aviso de Prisma:** al aplicar las migraciones, Prisma sugiere actualizar a `@latest`. Hay que ignorarlo: `latest` es Prisma 8, que no soporta SQL Server.

#### Problema encontrado en el seed: ids que empezaban en 0

El seed borra todo y reinicia los contadores IDENTITY con `DBCC CHECKIDENT`, para que los ids vuelvan a empezar en 1. Con `RESEED 0`, los torneos de Azure quedaron con id 0 y 1. En la base local no pasaba.

La regla de SQL Server es que **si la tabla nunca tuvo filas, el primer id es el valor del RESEED**; si ya tuvo filas, es ese valor más 1. Las tablas recién creadas en Azure nunca habían tenido filas.

La primera corrección (en AD-1) no alcanzó: en S-1 los usuarios quedaron con ids 0, 1 y 2, porque la tabla `Usuario` había recibido un RESEED del seed viejo sin haber tenido filas nunca. Midiendo en una tabla temporal se vio que `sys.identity_columns.last_value` **sigue en NULL hasta el primer INSERT, aunque haya un RESEED**, así que es la forma exacta de saber si la tabla nunca tuvo filas.

Corrección final en `prisma/seed.ts`:
- `last_value` NULL (nunca tuvo filas): `RESEED 1`, el primer id es 1.
- `last_value` con valor (ya tuvo filas): `RESEED 0`, el próximo id es 1.

Se probó en una tabla temporal en cuatro estados (nueva; con filas y vaciada; nueva con un RESEED 0 previo; y la corrida siguiente sobre esa misma tabla): en todos, el primer id es 1. En Azure, todas las tablas con IDENTITY empiezan en 1.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `.env` (no versionado) | `DATABASE_URL` apunta a Azure; la conexión local quedó comentada |
| `.env.example` | Formato de la cadena para Azure y para SQL Server local |
| `prisma/seed.ts` | RESEED condicional de los IDENTITY |

#### Cómo se probó

- `prisma migrate status` conecta y lista las 2 migraciones pendientes; `db:deploy` las aplica.
- El seed carga 8 equipos, 42 jugadores, Apertura (id 1, en curso) y Clausura (id 2, en inscripción).
- Tests unitarios (18) y end-to-end (1) pasan contra Azure.
- La API responde `/torneos` en menos de un segundo, y el frontend muestra la tabla de posiciones de Apertura con los mismos números que la base local.

**Para volver a la base local:** comentar la `DATABASE_URL` de Azure en `.env` y descomentar la local. Para crear migraciones nuevas (`prisma migrate dev`) conviene usar la base local, porque esa orden necesita crear una base "sombra" temporal; después se aplican en Azure con `pnpm db:deploy`.

### AD-2 — Jugador e Inscripción de jugador

**Estado:** Hecha (2026-11-10)

Incluye tres cosas:
- El CRUD de Jugador.
- El CRUD dependiente de Inscripción de jugador: el plantel de cada equipo en un torneo.
- El primer **permiso por pertenencia**: un usuario con rol Jugador ve y modifica sus propios datos.

#### Endpoints

| Método y ruta | Quién | Qué hace | Respuesta |
|:--|:--|:--|:-:|
| `GET /jugadores` | Administrador | Lista los jugadores con el id de su usuario. Con `?disponiblesEnTorneo=:id`, solo los que no están en ningún equipo de ese torneo | 200 |
| `GET /jugadores/:id` | Administrador o el propio jugador | Un jugador con sus inscripciones (equipo, torneo, dorsal y capitanía) | 200, 403 o 404 |
| `POST /jugadores` | Administrador | Crea un jugador | 201 |
| `PATCH /jugadores/:id` | Administrador o el propio jugador | Modifica los datos. El propio jugador, solo email, teléfono y dirección | 200 o 403 |
| `DELETE /jugadores/:id` | Administrador | Borra un jugador sin inscripciones ni usuario | 204 |
| `GET /torneos/:torneoId/inscripciones/:inscripcionId/jugadores` | Público | Plantel del equipo: dorsal, capitán y nombre, sin datos personales | 200 |
| `GET .../jugadores/:id` | Público | Una inscripción de jugador | 200 o 404 |
| `POST .../jugadores` | Administrador | Inscribe un jugador con dorsal y, opcionalmente, como capitán | 201 |
| `PATCH .../jugadores/:id` | Administrador | Cambia el dorsal o la capitanía | 200 |
| `DELETE .../jugadores/:id` | Administrador | Da de baja al jugador del equipo | 204 |

Las rutas de inscripción de jugador cuelgan de la inscripción del equipo, igual que esta cuelga del torneo (etapa 5). El plantel pertenece a un equipo **en un torneo**, no al equipo en general.

#### Reglas de negocio

| Regla | Respuesta |
|:--|:--|
| DNI repetido | 409 "Ya existe un jugador con el DNI ..." |
| DNI que no tiene 7 u 8 dígitos | 400 (DTO) |
| Un usuario sin rol Administrador pide o modifica un jugador que no es el suyo | 403 "Solo podés ver y modificar tus propios datos." |
| El propio jugador envía DNI, nombres o apellidos | 403: solo los cambia un administrador |
| Borrar un jugador inscripto en un equipo | 409 |
| Borrar un jugador con usuario asociado | 409 |
| Torneo finalizado | 409: el plantel ya no se puede modificar |
| El jugador ya está en otro equipo del mismo torneo | 409 "... ya está inscripto en ... en este torneo." |
| Dorsal repetido en el equipo | 409 "El dorsal X ya lo usa ... en este equipo." |
| Dorsal fuera de 1 a 99 | 400 (DTO) |
| Dar de baja a un jugador que ya jugó partidos con el equipo | 409 |

Decisiones:
- **Un solo capitán por equipo:** al marcar un capitán nuevo, el anterior deja de serlo en la misma transacción. Cambiar de capitán es una operación normal: con un 409 habría que hacerla en dos pasos.
- **Planteles modificables con el torneo en curso:** la inscripción de equipos se cierra al generar el fixture, pero un equipo puede sumar o cambiar jugadores a mitad del torneo. El plantel se bloquea recién cuando el torneo está finalizado.
- **El 403 va antes que el 404:** el permiso por pertenencia se controla antes de buscar el jugador. Un jugador que pide un id ajeno recibe 403 aunque ese id no exista, así no puede averiguar qué ids existen.
- **Dos emails distintos:** el del jugador es de contacto. No tiene relación con el email con el que su usuario inicia sesión.

#### Permiso por pertenencia

Los guards globales de S-3 deciden por rol: `@Roles(Rol.Administrador, Rol.Jugador)` deja pasar a los dos roles. La pertenencia depende del recurso pedido, así que la decide el servicio:

```ts
private validarPertenencia(id: number, sesion: UsuarioDeSesion): void {
  if (sesion.roles.includes(Rol.Administrador)) return;
  if (sesion.jugadorId !== id) {
    throw new ForbiddenException('Solo podés ver y modificar tus propios datos.');
  }
}
```

Desde S-6, `AutenticacionGuard` ya lee el usuario de la base en cada pedido. Ahora además agrega `jugadorId` al usuario de la sesión (`UsuarioDeSesion`), así el servicio lo tiene sin otra consulta.

En ASP.NET Core sería una policy con `IAuthorizationHandler<TRequirement, TResource>`, que recibe el recurso además del usuario.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/auth/contenido-token.ts` | Nuevo tipo `UsuarioDeSesion`: el contenido del token más `jugadorId` |
| `src/modules/auth/autenticacion.guard.ts` | Agrega `jugadorId` al usuario de la sesión |
| `src/modules/auth/usuario-actual.decorator.ts` | Devuelve `UsuarioDeSesion` |
| `src/modules/jugadores/dto/crear-jugador.dto.ts`, `modificar-jugador.dto.ts`, `filtro-jugadores.dto.ts` | Nuevos: validación del cuerpo y del parámetro `disponiblesEnTorneo` |
| `src/modules/jugadores/jugadores.repository.ts` | CRUD completo, filtro de disponibles e inscripciones del jugador |
| `src/modules/jugadores/jugadores.service.ts` | Reglas de negocio y permiso por pertenencia |
| `src/modules/jugadores/jugadores.controller.ts` | Los 5 endpoints de `/jugadores` |
| `src/modules/jugadores/jugadores.module.ts` | Exporta el servicio para las inscripciones |
| `src/modules/inscripciones-jugador/*` | Nuevo módulo: DTOs, repositorio (capitanía en transacción), servicio y controller |
| `src/modules/inscripciones-equipo/inscripciones-equipo.module.ts` | Exporta su servicio |
| `src/app.module.ts` | Importa `InscripcionesJugadorModule` |
| `src/modules/jugadores/jugadores.service.spec.ts` | Nuevo: 6 tests unitarios |
| `src/modules/inscripciones-jugador/inscripciones-jugador.service.spec.ts` | Nuevo: 8 tests unitarios |
| `test/jugadores.e2e-spec.ts` | Nuevo: 3 tests de integración |

#### Conceptos

- **Parámetros de la URL con DTO:** `@Query() filtro: FiltroJugadoresDto` valida `?disponiblesEnTorneo=` con el mismo pipe global que los cuerpos. `@Type(() => Number)` lo convierte de texto a número antes de validar. Es el `[FromQuery]` de ASP.NET Core con un modelo y su validador.
- **Filtro con `none` en Prisma:** "jugadores sin inscripciones en el torneo" se escribe `where: { inscripciones: { none: { inscripcionEquipo: { torneoId } } } }`, y Prisma lo traduce a un `NOT EXISTS`. En LINQ sería `.Where(j => !j.Inscripciones.Any(i => i.InscripcionEquipo.TorneoId == id))`.
- **Transacción interactiva:** `$transaction(async (tx) => { ... })` le quita la capitanía al anterior y guarda la nueva en una sola unidad. Es el `BeginTransaction` + `SaveChanges` + `Commit` de EF Core.
- **Campos según el rol en el mismo DTO:** el DTO valida la forma de todos los campos, y el servicio decide qué campos puede enviar cada rol (`CAMPOS_SOLO_ADMINISTRADOR`). Separarlo en dos endpoints también era válido, pero el plan pedía comparar `Usuario.jugadorId` con el jugador pedido sobre el mismo recurso.
- **Servicios de otros módulos para validar:** el servicio de inscripciones de jugador usa los de torneos, inscripciones de equipo y jugadores, igual que en la etapa 5. Cada módulo exporta su servicio, como registrar una interfaz en el contenedor de DI de .NET.

#### Cómo se probó

**Unitarios** (en total pasan 66):
- 6 de jugadores:
  - DNI repetido.
  - El administrador modifica todo.
  - El jugador ve solo lo suyo y recibe 403 incluso con un id inexistente.
  - El jugador solo modifica sus datos de contacto.
  - Un asistente no accede.
  - No se borra un jugador con inscripciones o con usuario.
- 8 de inscripciones:
  - El capitán es falso por defecto.
  - Un jugador que ya está en otro equipo del torneo.
  - Dorsal repetido en el equipo, pero válido en otro equipo.
  - Traspaso de capitanía.
  - Modificar sin cambiar el dorsal.
  - Torneo finalizado.
  - Baja de un jugador que jugó.
  - 404 al pedir una inscripción desde otro equipo.

**Integración** (`test/jugadores.e2e-spec.ts`, contra Azure; en total pasan 19):
- **Rol Jugador:**
  - Ve su detalle, con la inscripción de capitán.
  - Recibe 403 al pedir otro jugador y el listado.
  - Modifica su teléfono.
  - Recibe 403 al enviar el DNI.
  - El Asistente también recibe 403 al pedir ese jugador.
- **Ciclo del Administrador en Clausura:**
  - Alta del jugador, y 409 por DNI repetido.
  - Inscripción como capitán.
  - 409 al inscribir el mismo jugador en otro equipo y al repetir el dorsal.
  - El jugador ya no figura en `disponiblesEnTorneo`.
  - El plantel público no expone el DNI.
  - 409 al borrar al jugador inscripto, y después las bajas.
- **Sin permiso:** sin sesión responde 401; como Asistente, 403 al inscribir.

Ajustes del test de integración:
- Cada test tiene 30 segundos porque hace muchos pedidos a la base en la nube. La primera corrida pasó el límite de 5 segundos por defecto.
- Esa corrida cortada dejó un jugador inscripto y la siguiente falló por el dorsal ocupado. Por eso ahora, antes y después de los tests, se borran los jugadores de prueba que hayan quedado.

**Swagger:** aparecen los grupos "Jugadores" e "Inscripciones de jugadores".

El seed no carga `PartidoJugador`. La regla "no dar de baja a quien ya jugó" se va a poder probar con datos reales a partir de AD-4; por ahora la cubre el test unitario.

### AD-3 — Predio, Cancha y programación de partidos

**Estado:** Hecha (2026-11-10)

Incluye tres cosas:
- El CRUD de Predio.
- El CRUD dependiente de Cancha.
- La programación de los partidos del fixture: asignarles cancha y día y hora.

#### Endpoints

| Método y ruta | Quién | Qué hace | Respuesta |
|:--|:--|:--|:-:|
| `GET /predios` | Público | Lista los predios por nombre, cada uno con sus canchas | 200 |
| `GET /predios/:id` | Público | Un predio con sus canchas | 200 o 404 |
| `POST /predios` | Administrador | Crea un predio | 201 |
| `PATCH /predios/:id` | Administrador | Modifica nombre o dirección | 200 |
| `DELETE /predios/:id` | Administrador | Borra un predio sin canchas | 204 |
| `GET /predios/:predioId/canchas` | Público | Canchas del predio por número | 200 |
| `GET /predios/:predioId/canchas/:id` | Público | Una cancha | 200 o 404 |
| `POST /predios/:predioId/canchas` | Administrador | Crea una cancha | 201 |
| `PATCH /predios/:predioId/canchas/:id` | Administrador | Modifica número o descripción | 200 |
| `DELETE /predios/:predioId/canchas/:id` | Administrador | Borra una cancha sin partidos | 204 |
| `PATCH /partidos/:id/programacion` | Administrador | Asigna cancha y día y hora. Solo cambia lo que se envía; `null` lo deja "a confirmar" | 200 |

Decisiones sobre las rutas:
- **`GET /predios` trae las canchas:** una sola consulta sirve para la grilla de predios y para la lista de canchas del formulario de programación.
- **La programación tiene su propio recurso (`/partidos/:id/programacion`):** los partidos los crea el fixture; acá solo se cambian la cancha y el horario. En AD-4 se agrega la carga del resultado como otro recurso del partido.

El fixture (`GET /torneos/:id/fixture`) ahora devuelve también el `id` de la cancha y el `predioId`, para que el formulario muestre la cancha actual.

#### Reglas de negocio

| Regla | Respuesta |
|:--|:--|
| Nombre de predio repetido (sin importar mayúsculas) | 409 "Ya existe un predio llamado ..." |
| Borrar un predio con canchas | 409 |
| Número de cancha repetido en el predio | 409 "El predio ya tiene una cancha número X." |
| Número de cancha fuera de 1 a 99 | 400 (DTO) |
| Borrar una cancha con partidos asignados | 409 "... tiene N partidos asignados ..." |
| Programar un partido finalizado o ganado por WO | 409 "El partido ya se jugó: no se puede reprogramar." |
| Programar un partido de un torneo finalizado | 409 |
| La cancha tiene otro partido a menos de una hora | 409 "La cancha X de ... está ocupada: A vs B, el 21/11, 18:00." |
| Uno de los equipos tiene otro partido a menos de una hora, en cualquier torneo | 409 "Uno de los equipos ya juega a esa hora: ..." |
| La cancha no existe | 404 |

Decisiones:
- **Duración de un partido:** `DURACION_PARTIDO_MINUTOS = 60`. Dos partidos que empiezan con menos de una hora de diferencia se superponen. Coincide con el seed, que programa uno por hora en cada cancha.
- **Los suspendidos no ocupan el horario:** no se jugaron.
- **Reprogramar un suspendido** con día y hora nuevos lo vuelve a estado Programado.
- **Horarios de los mensajes en hora argentina:** se formatean con `Intl.DateTimeFormat` y `timeZone: 'America/Argentina/Buenos_Aires'`. Así el mensaje es el mismo aunque la API corra en un servidor con hora UTC (AD-6).
- **Un partido sin cancha o sin horario es válido:** queda "a confirmar". El fixture se puede generar sin fecha de inicio.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/predios/*` | Nuevo módulo: DTOs, repositorio (predios con canchas), servicio y controller |
| `src/modules/canchas/*` | Nuevo módulo: CRUD dependiente del predio |
| `src/modules/partidos/dto/programar-partido.dto.ts` | Nuevo: `fechaHora` (ISO 8601) y `canchaId`, opcionales y anulables |
| `src/modules/partidos/partidos.repository.ts` | Nuevo: el partido, la cancha, la búsqueda de superposiciones y la actualización |
| `src/modules/partidos/partidos.service.ts` | Nuevo: el caso de uso de programar, con sus reglas |
| `src/modules/partidos/partidos.controller.ts`, `partidos.module.ts` | Nuevos |
| `src/modules/fixture/fixture.repository.ts`, `fixture.service.ts`, `fixture-vista.ts` | La cancha del fixture incluye `id` y `predioId` |
| `src/app.module.ts` | Importa `PrediosModule`, `CanchasModule` y `PartidosModule` |
| `src/modules/partidos/partidos.service.spec.ts` | Nuevo: 9 tests unitarios |
| `src/modules/canchas/canchas.service.spec.ts` | Nuevo: 4 tests unitarios de predios y canchas |
| `test/predios.e2e-spec.ts` | Nuevo: 2 tests de integración |

#### Conceptos

- **Superposición como rango:** un partido que empieza a la hora `t` choca con los que empiezan entre `t - 60 min` y `t + 60 min`. La consulta es `fechaHoraPartido: { gt: desde, lt: hasta }`, un `WHERE fechaHoraPartido > @desde AND fechaHoraPartido < @hasta`. Con los extremos excluidos, un partido a las 19:00 no choca con uno a las 18:00.
- **`undefined` y `null` en un PATCH:** `undefined` (el campo no vino) deja el valor como estaba; `null` lo borra. Es la misma convención que `escudoURL` en Equipo y `jugadorId` en Usuario.
- **Filtro reutilizado:** `buscarConflicto(filtro, desde, hasta, excluirId)` arma la consulta común, y los dos casos le pasan su filtro: la cancha, o los dos equipos como local o visitante. Es como componer `IQueryable` con un `.Where` distinto en .NET.
- **El servicio de partidos no usa el de canchas:** necesita la cancha con su predio para el mensaje, y la consulta va en su propio repositorio. Así el módulo de partidos no depende del de canchas.

#### Cómo se probó

**Unitarios** (en total pasan 79):
- 9 de programación:
  - Asigna cancha y horario.
  - `null` deja el dato "a confirmar" y lo que no vino no cambia.
  - La misma cancha media hora después da 409; en otra cancha, pasa.
  - Una hora después en la misma cancha no se superpone.
  - Un equipo no juega dos partidos superpuestos, aunque sea en otra cancha.
  - No se reprograma un partido jugado ni uno de un torneo finalizado.
  - Un suspendido reprogramado vuelve a Programado, y un suspendido no ocupa el horario.
  - 404 por partido o cancha inexistentes.
- 4 de predios y canchas:
  - Nombre de predio repetido sin importar mayúsculas.
  - Número de cancha repetido en el predio, pero válido en otro.
  - 404 al pedir una cancha desde otro predio.
  - No se borra una cancha con partidos ni un predio con canchas.

**Integración** (`test/predios.e2e-spec.ts`, contra Azure; en total pasan 21):
- **Predio y cancha:**
  - El Asistente recibe 403 al crear un predio.
  - Alta de predio, y 409 por nombre repetido en mayúsculas.
  - Alta de cancha, 409 por número repetido y 400 por número 0.
  - 409 al borrar el predio con canchas.
  - El listado público muestra el predio con su cancha.
- **Programación sobre la última fecha de Apertura:**
  - Un partido en la cancha de prueba a las 18:00 responde 200, con la hora en UTC.
  - Otro partido en la misma cancha a las 18:30 da 409 "está ocupada".
  - Un partido de la fecha anterior con un equipo en común a las 18:30 da 409 "ya juega a esa hora".
  - El segundo partido a las 19:00 en esa cancha responde 200.
  - 409 al programar un partido jugado de la fecha 1, y 403 como Asistente.
  - 409 al borrar la cancha usada.
- **Limpieza:** en un `finally`, los partidos vuelven a su horario y su cancha originales. Antes y después de los tests se borran los predios "Prueba e2e". Se verificó que el fixture quedó igual y que solo queda el predio del seed.

### AD-4 — Caso de uso: cargar el resultado de un partido

**Estado:** Hecha (2026-11-10)

Es el segundo caso de uso de la aprobación directa. Usa los partidos que genera el primero (el fixture), así que los dos casos de uso quedan relacionados, como pide la cátedra. Lo hace el Asistente el día del partido, o el Administrador.

#### Endpoints

| Método y ruta | Quién | Qué hace | Respuesta |
|:--|:--|:--|:-:|
| `GET /partidos/:id` | Público | Planilla del partido: equipos con sus planteles (y quién jugó), marcador y eventos por minuto | 200 o 404 |
| `PUT /partidos/:id/resultado` | Asistente o Administrador | Carga el resultado y reemplaza lo que hubiera. Devuelve la planilla | 200 |
| `DELETE /partidos/:id/resultado` | Asistente o Administrador | Anula el resultado: el partido vuelve a Programado | 204 |

El cuerpo del `PUT` depende de qué pasó:

| `estadoPartido` | Qué lleva | Marcador |
|:--|:--|:--|
| 2 (Finalizado) | `jugadores`: inscripciones de los que jugaron; `eventos`: `{ tipoEvento, minuto, inscripcionJugadorId, inscripcionJugadorEntraId? }` | Se calcula de los goles |
| 3 (W.O.) | `equipoGanadorId`: el equipo que se presentó | 3 a 0 para el ganador |
| 4 (Suspendido) | Nada | Sin marcador |

Tipos de evento: 1 gol, 2 gol en contra, 3 amonestación, 4 expulsión y 5 cambio. En un cambio, `inscripcionJugadorId` es el que sale e `inscripcionJugadorEntraId` el que entra.

Decisiones sobre el diseño de la API:
- **`PUT` y no `POST`:** la planilla se envía entera y reemplaza la anterior. Cargar dos veces lo mismo deja el mismo resultado (es idempotente), y así una corrección es otra carga.
- **El marcador no se envía, se calcula:** no puede quedar un 3 a 1 con dos goles cargados.
- **Jugadores identificados por su inscripción** (`InscripcionJugador`) y no por `Jugador`: el plantel es del equipo en ese torneo, y la base guarda `PartidoJugador.inscripcionJugadorId`.

#### Reglas de negocio

| Regla | Respuesta |
|:--|:--|
| El torneo está finalizado | 409 |
| Jugado o W.O. de un partido sin día y hora | 409 "Primero hay que programar el día y hora del partido." |
| Jugado o W.O. antes de la hora del partido | 409 "El partido todavía no empezó..." |
| Un jugador que no está inscripto en ninguno de los dos equipos | 400 en `jugadores` |
| Un evento de un jugador que no figura entre los que jugaron | 400 en `eventos.N.inscripcionJugadorId` |
| Cambio sin jugador que entra, con el mismo jugador, o con uno del otro equipo o que no jugó | 400 en `eventos.N.inscripcionJugadorEntraId` |
| Un evento que no es cambio con jugador que entra | 400 |
| W.O. sin ganador o con un equipo que no es del partido | 400 en `equipoGanadorId` |
| Jugadores o eventos en un W.O. o un suspendido | 400 |
| Minuto fuera de 0 a 130, tipo de evento inválido o ids repetidos | 400 (DTO) |
| Anular un partido sin resultado | 409 "El partido no tiene resultado cargado." |

Decisiones:
- **Un suspendido se puede cargar antes de la hora:** un partido se puede suspender por adelantado, por ejemplo por lluvia.
- **W.O. 3 a 0:** es la convención habitual y la misma que usa el seed.
- **Sin reglas de disciplina:** no se controla que un expulsado no tenga eventos posteriores ni que dos amarillas sean una roja. No lo pide el alcance y complicaría la carga.
- **La tabla de posiciones no se toca:** se calcula a partir de los partidos (etapa 6), así que se actualiza sola al guardar o anular.
- **Regla de AD-2 con datos reales:** un jugador que jugó un partido ya no se puede dar de baja del plantel. El test de integración lo verifica.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/partidos/tipo-evento.enum.ts` | Nuevo: `TipoEvento` y sus valores para `@IsIn` |
| `src/modules/partidos/calcular-marcador.ts` | Nuevo: función pura que calcula el marcador; marcador del W.O. |
| `src/modules/partidos/dto/cargar-resultado.dto.ts` | Nuevo: `CargarResultadoDto` con `EventoDto` anidado |
| `src/modules/partidos/planilla-partido.ts` | Nuevo: tipos de la respuesta |
| `src/modules/partidos/partidos.repository.ts` | Planilla, planteles, `guardarResultado` y `anularResultado` en transacción |
| `src/modules/partidos/resultados.service.ts` | Nuevo: el caso de uso y sus reglas |
| `src/modules/partidos/partidos.controller.ts`, `partidos.module.ts` | Los 3 endpoints nuevos y el servicio |
| `src/modules/partidos/calcular-marcador.spec.ts` | Nuevo: 4 tests unitarios |
| `src/modules/partidos/resultados.service.spec.ts` | Nuevo: 9 tests unitarios |
| `test/resultados.e2e-spec.ts` | Nuevo: test de integración del caso de uso completo |
| `vitest.config.e2e.ts` | `fileParallelism: false`: los archivos de integración corren de a uno |
| `prisma/seed.ts` | Planteles de 9 jugadores y planilla coherente en los partidos jugados (ver "Seed con planillas") |

#### Conceptos

- **Validación anidada:** `@ValidateNested({ each: true })` y `@Type(() => EventoDto)` validan cada evento de la lista con sus propias reglas, y los errores llegan como `eventos.2.minuto`. Es el `RuleForEach(x => x.Eventos).SetValidator(new EventoValidator())` de FluentValidation.
- **Ids generados antes de insertar:** los eventos apuntan a filas de `PartidoJugador` que se crean en la misma transacción. Como `createMany` no devuelve los ids en SQL Server, se generan con `randomUUID()` antes, igual que las fechas del fixture. En EF Core no hace falta: `SaveChanges` completa las claves de las entidades relacionadas.
- **Borrar y volver a crear en una transacción:** `guardarResultado` borra los eventos y los jugadores anteriores y crea los nuevos. Es más simple y seguro que comparar qué cambió, y si algo falla no queda una planilla a medias.
- **Marcador como función pura:** `calcularMarcador` no accede a la base, como `calcularPosiciones` y `generarFixture`, así que se prueba con tests unitarios simples. El frontend tiene una copia para mostrar el marcador mientras se carga; el que vale es el del backend.
- **"Ahora" como parámetro:** `cargar(id, dto, ahora = new Date())` permite probar la regla "todavía no empezó" sin depender del reloj. Es el `TimeProvider` de .NET 8.

#### Seed con planillas

El seed (`prisma/seed.ts`) carga la planilla de cada partido jugado de Apertura. Así, la planilla, el fixture y la defensa muestran goleadores, tarjetas y cambios reales.

Cambios en los datos de prueba:
- **Planteles de 9 jugadores por equipo:** los dorsales 1, 2, 4, 5, 8, 9 y 10 son los titulares (fútbol 7) y el 11 y el 14, los suplentes. En total son 54 jugadores (antes, 42). El usuario Jugador sigue asociado al capitán (dorsal 10) de Los Halcones.
- **Planilla de los 7 partidos finalizados:**
  - Juegan los 7 titulares de cada equipo y los suplentes que entran.
  - Los goles suman exactamente el marcador, y alrededor del 15 % son en contra, de un jugador del rival.
  - Uno o dos cambios por equipo en el segundo tiempo, de 0 a 3 amonestaciones por partido y, a veces, una expulsión.
- **El W.O. y el suspendido** siguen sin planilla, igual que los partidos programados.

La función `generarPlanilla` arma primero los eventos con su minuto y su equipo, y después los recorre en orden cronológico. Va asignando jugadores que estén en cancha en ese momento, así se cumplen estas reglas:
- Nadie hace un gol después de salir o de ser expulsado, ni antes de entrar.
- Nadie recibe dos amarillas.
- El arquero no hace goles.
- Un cambio es entre un jugador en cancha y un suplente del mismo equipo.

El generador pseudoaleatorio tiene semilla fija, así que cada ejecución carga exactamente lo mismo. Al consumir más números que antes, los marcadores de los partidos cambiaron respecto del seed anterior. Los `PartidoJugador` y los `Evento` se insertan con ids generados antes (`randomUUID`), como en `guardarResultado`.

Resultado: 50 eventos (13 goles, 1 gol en contra, 12 amonestaciones, 2 expulsiones y 22 cambios).

**Cómo se verificó:**
- Antes de ejecutar el seed (que borra la base), se contó lo que había en Azure: coincidía exactamente con el seed anterior, sin datos cargados a mano.
- Después, un script recorrió las 15 planillas por la API y comprobó estas condiciones, sin encontrar problemas:
  - El marcador coincide con los goles.
  - Todos los protagonistas jugaron.
  - Los cambios son válidos y los suplentes que figuran son los que entraron.
  - Nadie actúa después de salir ni antes de entrar.
  - No hay dobles amarillas ni goles del arquero.
  - El W.O., el suspendido y los programados no tienen planilla.
- La primera versión, con 10 % de goles en contra, no generó ninguno con esta semilla, así que se subió a 15 %.
- Siguen pasando los 92 tests unitarios y los 22 de integración.

#### Problema encontrado: tests de integración en paralelo

Al agregar este test, falló el de programación de AD-3: "El partido ya se jugó: no se puede reprogramar".

Vitest corre los archivos de test en paralelo. Los dos usan la misma base: mientras el test de resultados tenía el primer partido de la fecha 4 cargado como jugado, el de programación intentaba reprogramar justamente ese partido.

Cada test restaura lo que cambia, pero en paralelo un test ve los cambios temporales del otro. Se configuró `fileParallelism: false` para que los archivos de integración corran de a uno. Tardan más (unos 70 segundos), pero son confiables. Se verificó que el fixture había quedado igual después de la corrida fallida.

#### Cómo se probó

**Unitarios** (en total pasan 92):
- 4 de `calcularMarcador`: sin eventos, goles y goles en contra, tarjetas y cambios no suman, y el W.O.
- 9 del servicio:
  - El marcador se calcula de los goles y se guardan jugadores y eventos.
  - Jugadores de otro equipo y eventos de quien no jugó.
  - Las tres reglas del cambio, y que solo un cambio lleva jugador que entra.
  - W.O. 3 a 0, y sin ganador o con uno ajeno.
  - Suspendido sin marcador, cargado antes de la hora.
  - Partido sin programar y partido que todavía no empezó.
  - Torneo finalizado.
  - Anular con y sin resultado.

**Integración** (`test/resultados.e2e-spec.ts`, contra Azure; en total pasan 22), sobre el primer partido de la fecha 4 de Apertura:
- La planilla pública trae los dos planteles.
- El Jugador recibe 403 y un jugador de otro partido da 400.
- El Asistente carga 14 jugadores y 6 eventos (incluidos un gol en contra y un cambio); el marcador queda 2 a 2.
- La tabla suma un partido jugado al local.
- Dar de baja del plantel a un jugador que jugó da 409.
- El Administrador lo corrige a W.O. del visitante (0 a 3, sin eventos).
- El Asistente lo anula: vuelve a Programado y la tabla queda como antes.
- **Limpieza:** un `finally` anula el resultado si algo falló.

**Swagger:** los 3 endpoints nuevos en el grupo "Partidos".

### AD-5 — Tests

**Estado:** Hecha (2026-11-10)

**Qué pide la cátedra en el backend** para la aprobación directa: un test automatizado por integrante y un test de integración. Para la documentación de aprobación pide además la evidencia de ejecución de los tests.

**Cómo estaba:** las subetapas anteriores ya habían dejado 92 tests unitarios y 22 de integración. En AD-5:
- Se completaron los tests unitarios que faltaban.
- Se agregaron reportes de cobertura.
- Se armó la integración continua en GitHub Actions.
- Se documentó todo en [`docs/tests.md`](tests.md).

> **"1 test por integrante":** el TP lo hace un solo integrante (Juan Urquiza abandonó el TP), así que alcanza con los tests de Mateo.

#### Tests unitarios nuevos

Los servicios de los CRUD de regularidad solo se probaban por integración. Ahora tienen tests unitarios con repositorios en memoria, igual que los de AD-2 a AD-4:

| Archivo | Casos |
|:--|:--|
| `src/modules/torneos/torneos.service.spec.ts` | Estado inicial Inscripción, modificación parcial que no toca el estado, 404, borrado con y sin datos asociados |
| `src/modules/equipos/equipos.service.spec.ts` | Escudo opcional como `null`, nombre único sin importar mayúsculas, modificar con el mismo nombre, borrado con datos asociados |
| `src/modules/inscripciones-equipo/inscripciones-equipo.service.spec.ts` | Inscribir, equipo repetido, inscripciones cerradas, 404 de equipo y de inscripción, cambio de equipo, baja con jugadores |

En total, 106 tests unitarios en 17 archivos.

#### Cobertura

| Comando | Qué mide | Reporte |
|:--|:--|:--|
| `pnpm test:cov` | Tests unitarios | `coverage/index.html` |
| `pnpm test:cov:e2e` (nuevo) | Tests de integración | `coverage-e2e/index.html` |

Los dos reportes miden todo `src/` sin lo que genera Prisma (`src/generated`). Antes, el reporte contaba solo los archivos que cargaba algún test e incluía código generado.

| Corrida | Líneas | Funciones |
|:--|:-:|:-:|
| Unitarios | 51,8 % | 30,9 % |
| Integración | 74,7 % | 74,9 % |

Se complementan:
- **Unitarios:** cubren las reglas de negocio y las funciones puras, pero no cargan controllers ni repositorios.
- **Integración:** recorren la API completa, así que cubren también controllers, repositorios, guards y el filtro de errores.

#### Integración continua

`.github/workflows/tests.yml` corre en GitHub en cada push y pull request a `main`:
1. Instala las dependencias (`pnpm install --frozen-lockfile`).
2. Corre el lint.
3. Compila.
4. Ejecuta los tests unitarios con cobertura.
5. Guarda el reporte como artefacto.

El README muestra el estado del workflow con un badge.

Detalles de la configuración:
- **`DATABASE_URL` de relleno:** el `postinstall` ejecuta `prisma generate`, y `prisma.config.ts` exige la variable aunque no se conecte. Los tests unitarios no usan base.
- **Sin tests de integración en GitHub:** la base de Azure solo acepta las IP habilitadas en su firewall. Se corren en local.
- **Versiones:** pnpm 11 y Node 24, las mismas que en desarrollo.

**Verificación antes del push:** no se puede ejecutar GitHub Actions desde la máquina. Se simuló copiando el repositorio, con los cambios sin commitear, a una carpeta limpia: sin `node_modules`, sin `.env` y con la `DATABASE_URL` de relleno. Ahí se corrieron los mismos comandos: instalación, lint, build y tests con cobertura, y todos pasaron. Al hacer el push conviene mirar la pestaña Actions para confirmar que también pasa en GitHub.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/torneos/torneos.service.spec.ts`, `equipos/equipos.service.spec.ts`, `inscripciones-equipo/inscripciones-equipo.service.spec.ts` | Nuevos: tests unitarios |
| `vitest.config.ts` | Cobertura de todo `src/` sin lo generado |
| `vitest.config.e2e.ts` | Cobertura de los tests de integración en `coverage-e2e/` |
| `package.json` | Script `test:cov:e2e` |
| `.github/workflows/tests.yml` | Nuevo: integración continua |
| `.gitignore` | `coverage-e2e/` |
| `docs/tests.md` | Nuevo: cómo correr los tests, qué cubren y evidencia de ejecución |
| `README.md` | Badge del workflow, sección Tests y scripts de test |

#### Conceptos

- **Unitario frente a integración:**
  - El unitario prueba una clase aislada, reemplazando lo que usa por versiones falsas. Es rápido y no necesita base.
  - El de integración prueba varias piezas juntas: acá, la API entera con `Test.createTestingModule` y pedidos HTTP con Supertest. Es el `WebApplicationFactory` de ASP.NET Core.
- **Cobertura:** porcentaje del código que se ejecutó durante los tests. Mide qué se recorrió, no si se verificó bien: es una guía para encontrar huecos, no un objetivo en sí. El proveedor `v8` usa la instrumentación del propio motor de JavaScript.
- **Integración continua:** cada push dispara los tests en un servidor limpio. Si algo depende de la máquina de alguien (un `.env`, un paquete instalado a mano), falla ahí y no en la corrección. `--frozen-lockfile` instala exactamente las versiones de `pnpm-lock.yaml` y falla si no coinciden con `package.json`.

#### Cómo se probó

- **Unitarios:** pasan los 106 (`pnpm test:cov`).
- **Integración:** pasan los 22 contra Azure (`pnpm test:cov:e2e`).
- **Workflow:** simulado en una copia limpia, como se describe arriba.
- **Calidad:** lint y compilación sin errores.

### Extra — Fotos de perfil en Azure Blob Storage

**Estado:** Hecha (2026-11-11)

No es un requisito de la cátedra. Cada usuario sube, cambia o quita su foto de perfil; la ven él y el Administrador. Los archivos van a **Azure Blob Storage** y la base guarda solo el nombre del archivo. En desarrollo se usa **Azurite**, el emulador oficial: el código es el mismo y solo cambia la cadena de conexión del `.env`.

#### Endpoints

| Método y ruta | Acceso | Qué hace |
|:--|:--|:--|
| `PUT /usuarios/yo/foto` | Cualquier usuario con sesión | Sube o reemplaza su foto. Formulario multipart, campo `foto`, JPG, PNG o WebP de hasta 2 MB. Devuelve el usuario actualizado |
| `DELETE /usuarios/yo/foto` | Cualquier usuario con sesión | Quita su foto. Devuelve el usuario actualizado |
| `GET /usuarios/:id/foto` | El propio usuario o el Administrador | Devuelve la foto (`image/webp`). 403 para otro usuario, antes que el 404 |

#### Pasos

```powershell
pnpm add @azure/storage-blob sharp
pnpm add -D azurite

# Azurite (emulador de Blob Storage) en el puerto 10000, con los datos en .azurite/
pnpm storage:local
```

- **`sharp`** viene con su binario precompilado y no necesita aprobar scripts. Azurite trae `protobufjs`, que pide correr un script de instalación que no hace falta: quedó en `false` en `pnpm-workspace.yaml`.
- **Migración `20261111120000_usuario_foto_perfil`:** renombra `fotoPerfilURL` a `fotoPerfil` con `sp_rename`. Está escrita a mano porque Prisma habría generado `DROP` + `ADD COLUMN` y se perderían los datos. Se aplicó con `pnpm db:deploy`.
- **`.env`:** `AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true` (Azurite) y, opcional, `AZURE_STORAGE_CONTENEDOR_FOTOS` (por defecto `fotos-perfil`).
- **Para usar la cuenta de Azure:** cambiar la cadena de conexión por la del portal (cuenta de almacenamiento → Claves de acceso). Es secreta, como la de la base. Conviene deshabilitar el acceso anónimo de blobs en la cuenta: el contenedor es privado.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/almacenamiento/almacenamiento.service.ts` | Nuevo: subir, descargar y borrar archivos con `@azure/storage-blob`. Crea el contenedor (privado) la primera vez que se usa; los errores del almacenamiento responden 503 |
| `src/modules/almacenamiento/almacenamiento.module.ts` | Nuevo: el servicio y su configuración |
| `src/modules/usuarios/fotos-perfil.service.ts` | Nuevo: validar y reprocesar la imagen con `sharp`, nombre aleatorio, reemplazo (borra la anterior), permisos para verla |
| `src/modules/usuarios/fotos-perfil.controller.ts` | Nuevo: los 3 endpoints, con `FileInterceptor` (multer) y límite de 2 MB |
| `src/modules/usuarios/usuarios.service.ts` | Al borrar un usuario, borra también su foto |
| `src/modules/usuarios/usuarios.repository.ts` | `cambiarFotoPerfil`; `fotoPerfil` en los campos públicos |
| `src/modules/usuarios/usuario.ts` | `fotoPerfilURL` → `fotoPerfil` |
| `src/config/configuracion.ts` | `AZURE_STORAGE_CONNECTION_STRING` (obligatoria) y `AZURE_STORAGE_CONTENEDOR_FOTOS` (validado con las reglas de nombres de Azure) |
| `src/common/errores/excepciones.filter.ts` | 413 ("El archivo supera el tamaño máximo permitido (2 MB).") y los errores de multer en español; nombres para 413 y 503 |
| `prisma/schema.prisma` y la migración | Columna `fotoPerfil` |
| `prisma/seed.ts` | Borra del almacenamiento las fotos de los usuarios antes de borrarlos |
| `package.json` | Script `storage:local` |
| `.gitignore` | `.azurite/` |
| `.env.example` | Variables del almacenamiento |

#### Conceptos

- **Blob Storage:** almacenamiento de archivos de Azure. Una *cuenta* tiene *contenedores* (como carpetas de primer nivel) y cada contenedor tiene *blobs* (los archivos). Es el lugar para archivos; la base guarda solo una referencia. Guardar imágenes en la base (`varbinary`) la agranda y encarece las copias de seguridad.
- **Azurite:** emulador local de Blob Storage. Implementa la misma API, así que el SDK no nota la diferencia. `UseDevelopmentStorage=true` es una cadena de conexión especial que apunta a Azurite con su cuenta de prueba (`devstoreaccount1`), que es pública. En .NET es lo mismo con `Azure.Storage.Blobs`.
- **Se guarda el nombre del archivo, no la URL:** en Azurite la dirección es `http://127.0.0.1:10000/devstoreaccount1/...` y en Azure, `https://<cuenta>.blob.core.windows.net/...`. Con el nombre solo, cambiar de ambiente no rompe las fotos.
- **Contenedor privado y la API como intermediaria:** nadie puede leer los blobs sin la clave de la cuenta. La API descarga la foto y la devuelve después de controlar el permiso, igual que cualquier otro dato. Por eso el frontend la pide con `fetch` y el token, no con un `<img src>`.
- **Reprocesar la imagen con `sharp`:** no se guarda el archivo subido. Se lee con `sharp`, se rota según la orientación de la cámara, se recorta al centro a 256 × 256 y se guarda en WebP.
  - **Valida el contenido real:** un texto renombrado a `.png` falla al leerlo, aunque el navegador diga `image/png`.
  - **Borra los metadatos EXIF:** pueden traer la ubicación GPS de donde se sacó la foto.
  - **Descarta cualquier contenido escondido** dentro del archivo.
  - **Todas las fotos pesan pocos KB.** En .NET sería ImageSharp.
- **Nombre aleatorio (UUID):** no se puede deducir de quién es una foto ni adivinar el nombre de la de otro.
- **`FileInterceptor` (multer):** recibe el formulario multipart y deja el archivo en memoria. El límite de 2 MB corta el pedido apenas lo supera, sin leerlo entero. Es el `IFormFile` de ASP.NET Core con `RequestSizeLimit`.
- **`StreamableFile`:** respuesta binaria con su tipo (`image/webp`). Es el `return File(bytes, "image/webp")` de un controller de .NET.
- **Orden de las operaciones al reemplazar:** subir el archivo nuevo → guardar en la base → borrar el anterior. Si la base falla, se borra el nuevo; si falla el borrado del anterior, solo queda un archivo huérfano (se registra en el log), pero la base queda bien.
- **El contenedor se crea al usarlo, no al arrancar:** si Azurite está apagado, la API arranca igual y solo las fotos responden 503 ("El almacenamiento de archivos no está disponible.").

#### Cómo se probó

- **Unitarios** (`fotos-perfil.service.spec.ts`, con `sharp` de verdad y almacenamiento y base en memoria; pasan los 134 del backend):
  - Guarda la foto en WebP de 256 × 256 con nombre aleatorio.
  - Descarta el EXIF de un JPG que lo tenía.
  - Al reemplazarla, borra la anterior.
  - Rechaza un texto, un archivo vacío y un GIF.
  - Quitarla la borra de la base y del almacenamiento.
  - La ven el propio usuario y el Administrador; otro usuario recibe 403; sin foto, 404.
- **Integración** (`test/fotos-perfil.e2e-spec.ts`, contra Azure SQL y Azurite, 4 tests):
  - Subida de un PNG de 800 × 600 que vuelve como WebP de 256 × 256.
  - La ven el usuario y el Administrador; el Asistente recibe 403.
  - Un texto responde 400; 3 MB responden 413 con el mensaje en español; sin archivo, 400.
  - Quitarla y después 404; sin sesión, 401.

  En la suite completa pasaron 29 de 30. Falló el mismo de S-7, por el usuario `jugador2@ligahub.test` que no es del seed.

#### Ampliación: foto desde una dirección de internet (SSRF)

`PUT /usuarios/yo/foto/url` con `{ "url": "https://..." }` usa como foto una imagen de internet. La descarga el backend: desde el navegador no se puede, porque CORS impide leer imágenes de otros sitios. Después sigue el mismo camino que un archivo subido (validación y reprocesado con `sharp`).

**El riesgo: SSRF (*Server-Side Request Forgery*).** Si la API descargara cualquier dirección, un usuario podría usarla para llegar a lo que solo ella alcanza: la propia máquina (`127.0.0.1`, Azurite en el puerto 10000), la red interna o el servicio de credenciales de Azure (`169.254.169.254`), que entrega tokens de la identidad administrada. `DescargadorImagenes` lo impide así:

| Medida | Cómo |
|:--|:--|
| Solo `http` y `https`, puertos 80 y 443, sin usuario ni contraseña en la dirección | Se revisa la URL antes de conectar |
| Sin redes privadas, locales ni reservadas | `BlockList` de Node con las redes bloqueadas (IPv4 e IPv6, incluida una IPv4 escrita como IPv6, `::ffff:127.0.0.1`) |
| La IP se valida **al conectar** | Se reemplaza el `lookup` del DNS que usa el socket: si el nombre resuelve a una IP bloqueada, la conexión no se abre. Validar antes de conectar no alcanza, porque el nombre puede resolver a una IP pública al validar y a una privada al conectar (*DNS rebinding*) |
| Una IP escrita directamente también se valida | No pasa por el DNS, así que se revisa con la URL |
| Cada redirección se vuelve a validar, como máximo 3 | Un sitio público podría redirigir a `169.254.169.254` |
| Tiempo máximo de 10 segundos para toda la descarga | Además del de inactividad: un servidor que manda un byte por segundo no la deja colgada |
| Se corta apenas supera 2 MB, y el tipo tiene que ser `image/*` | No se descarga entero para después rechazarlo |
| 5 pedidos por minuto por IP (`ThrottlerGuard`, el mismo del login) | Que no se use la API para descargar en cantidad |
| Mensajes genéricos | No dicen si la dirección interna existe o qué respondió |

Se usa `node:http`/`node:https` y no `fetch`, porque permiten controlar el `lookup` de cada conexión. En .NET sería un `HttpClient` con un `SocketsHttpHandler.ConnectCallback` que valida la IP.

| Archivo | Cambio |
|:--|:--|
| `src/modules/usuarios/descargador-imagenes.ts` | Nuevo: la descarga con las protecciones; `esDireccionPublica` |
| `src/modules/usuarios/descargador-imagenes.spec.ts` | Nuevo: redes bloqueadas y descarga contra un servidor HTTP local |
| `src/modules/usuarios/dto/foto-desde-url.dto.ts` | Nuevo: `url` con `@IsUrl` (http o https) y hasta 2000 caracteres |
| `src/modules/usuarios/fotos-perfil.constantes.ts` | Nuevo: tamaño, lado y tipo de la foto (los usan el servicio y el descargador sin importarse entre sí) |
| `src/modules/usuarios/fotos-perfil.service.ts`, `fotos-perfil.controller.ts`, `usuarios.module.ts` | `subirDesdeUrl` y el endpoint con `ThrottlerGuard` |

**Cómo se probó:**
- **Unitarios** (`descargador-imagenes.spec.ts`; pasan los 162 del backend):
  - Qué IP son públicas y cuáles no (14 casos).
  - Se rechazan otro protocolo, otro puerto, credenciales en la URL, `127.0.0.1`, `[::1]`, `169.254.169.254`, `192.168.0.1`, `localhost` (bloqueado al resolverlo) y una dirección mal formada.
  - Contra un servidor HTTP local, con una subclase que habilita solo esa IP y su puerto:
    - descarga una imagen;
    - sigue una redirección, pero rechaza una que va a `169.254.169.254`;
    - rechaza una página HTML, un 404 y una imagen de 3 MB.
- **Integración** (`fotos-perfil.e2e-spec.ts`, ahora 5 tests): una dirección hacia Azurite (`127.0.0.1:10000`) responde 400 "no está permitida"; una dirección inválida, 400 en el campo `url`.
- **A mano:** con la dirección del logo de Google, la API la descargó, la recortó y la barra la mostró.

### Voluntario — Goleadores y suspensiones

**Estado:** Hecha (2026-11-11)

Dos ítems del alcance adicional voluntario de la proposal: el **listado de goleadores** filtrado por torneo y el caso de uso **calcular suspensiones a partir de las tarjetas** de cada partido. Los dos se calculan a partir de las planillas que carga el caso de uso de AD-4; no se guardan, igual que la tabla de posiciones. Así una corrección en una planilla los actualiza solos.

#### Endpoints

| Método y ruta | Acceso | Qué hace |
|:--|:--|:--|
| `GET /torneos/:torneoId/goleadores` | Público | Jugadores con al menos un gol en los partidos jugados: posición, jugador, equipo, goles y partidos jugados |
| `GET /torneos/:torneoId/suspensiones` | Público | Sanciones (motivo, fecha en que se recibió, partidos en que se cumple y si está cumplida) y tarjetas de cada jugador |

Además, la planilla (`GET /partidos/:id`) marca a cada jugador con `suspendido`, y `PUT /partidos/:id/resultado` responde **409** si anota a un jugador que cumple una suspensión en ese partido.

#### Reglas de las suspensiones

| Regla | Detalle |
|:--|:--|
| Expulsión | Suspende 1 fecha (`FECHAS_POR_EXPULSION`) |
| Amarillas | Cada 5 acumuladas en el torneo (`AMONESTACIONES_PARA_SUSPENSION`) suspenden 1 fecha, y la cuenta vuelve a empezar |
| Amarillas del partido de la expulsión | No se acumulan: la expulsión ya las sanciona (por ejemplo, la doble amarilla) |
| Dónde se cumple | En los próximos partidos de **su equipo**, por número de fecha, desde la fecha siguiente. Si el equipo queda libre en una fecha, se cumple en la siguiente que juegue |
| Partidos suspendidos | No cuentan: no se jugaron |
| Dos sanciones | Se cumplen una después de la otra |
| Cumplida | Cuando los partidos en que se cumple ya se jugaron (o se ganaron por W.O.) |
| Sin partidos restantes | La sanción queda pendiente, sin partido asignado |

Las reglas son constantes de `calcular-suspensiones.ts`, para cambiarlas en un solo lugar si la liga usa otras (por ejemplo, 3 amarillas).

#### Diseño

- **Funciones puras, como `calcularPosiciones`:** `calcularGoleadores` y `calcularSuspensiones` reciben los datos ya consultados y no tocan la base. Tienen tests unitarios con casos armados a mano.
- **Goleadores en una sola consulta:** `partidoJugador.findMany` con un `_count` filtrado (`eventos: { where: { tipoEvento: Gol } }`). Prisma lo resuelve con un `COUNT` en la misma consulta. Es el `Count(e => e.TipoEvento == Gol)` dentro de un `Select` de EF Core. Los goles en contra no se suman al jugador.
- **Posición compartida:** a igual cantidad de goles, la misma posición (1, 2, 2, 4). El orden dentro del empate es por menos partidos jugados y después por apellido.
- **Suspensiones dentro de la carga del resultado:** `SuspensionesModule` exporta su servicio y `PartidosModule` lo importa. `ResultadosService` lo usa para validar la planilla y para marcar a los suspendidos. Al validar, el partido que se carga cuenta como jugable aunque figure como suspendido.
- **Por qué validar en el backend:** el frontend deshabilita la casilla del suspendido, pero la regla la aplica la API, como todas las demás.

#### Conceptos

- **`_count` filtrado de Prisma:** cuenta registros relacionados que cumplen una condición sin traerlos. Evita traer todos los eventos para contarlos en memoria.
- **Módulo que exporta un servicio:** `exports: [SuspensionesService]` en un módulo y `imports: [SuspensionesModule]` en otro. Es registrar el servicio en el contenedor de DI de un proyecto y referenciarlo desde otro.

#### Archivos

| Archivo | Cambio |
|:--|:--|
| `src/modules/goleadores/calcular-goleadores.ts` | Nuevo: tabla de goleadores (función pura) |
| `src/modules/goleadores/goleadores.repository.ts`, `.service.ts`, `.controller.ts`, `.module.ts` | Nuevos: consulta, 404 si el torneo no existe, endpoint público |
| `src/modules/suspensiones/calcular-suspensiones.ts` | Nuevo: reglas de las suspensiones (función pura) y `suspendidosEnPartido` |
| `src/modules/suspensiones/suspensiones.repository.ts`, `.service.ts`, `.controller.ts`, `.module.ts` | Nuevos: partidos y tarjetas del torneo, `suspendidosEn(torneoId, partidoId)` para la carga del resultado, endpoint público |
| `src/modules/partidos/resultados.service.ts` | Rechaza a un suspendido (409) y marca `suspendido` en la planilla |
| `src/modules/partidos/planilla-partido.ts` | Campo `suspendido` en cada jugador del plantel |
| `src/modules/partidos/partidos.module.ts` | Importa `SuspensionesModule` |
| `src/app.module.ts` | Registra `GoleadoresModule` y `SuspensionesModule` |
| `prisma/seed.ts` | Un expulsado no figura en la planilla del partido siguiente de su equipo |
| `src/modules/goleadores/calcular-goleadores.spec.ts`, `src/modules/suspensiones/calcular-suspensiones.spec.ts` | Nuevos: tests unitarios |
| `src/modules/partidos/resultados.service.spec.ts` | Casos del suspendido |
| `test/resultados.e2e-spec.ts` | Anota solo a los disponibles; nuevo test de la suspensión de punta a punta y de los dos listados |

#### Cómo probarlo

1. `GET /torneos/1/goleadores` y `GET /torneos/1/suspensiones` en Swagger, sin sesión.
2. Como Asistente, cargar una expulsión en un partido y abrir la planilla del partido siguiente de ese equipo: el jugador figura como suspendido y no se puede anotar.
3. `pnpm test` y, solo el de integración de resultados, `pnpm exec vitest run --config ./vitest.config.e2e.ts test/resultados.e2e-spec.ts`.

> **Datos de la base anteriores a este cambio:** el seed viejo podía anotar a un expulsado en la fecha siguiente (en la base actual, Fernández jugó la fecha 2 después de su expulsión en la fecha 1). La planilla lo muestra suspendido y marcado como que jugó; para volver a guardarla hay que sacarlo. El seed nuevo ya no genera ese caso.

### AD-6 — Ambientes y deploy

- Ambientes desarrollo, test y producción con `.env` y validación de la configuración al arrancar.
- Deploy de la API (por ejemplo, Azure App Service) y CORS para el frontend publicado.
