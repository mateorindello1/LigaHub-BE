# Plan de desarrollo — LigaHub Backend

Registro de lo que se va haciendo, etapa por etapa: qué comandos se ejecutaron, qué archivos se crearon y para qué sirve cada cosa. Sirve para entender el proyecto y para poder rehacerlo desde cero.

Cada etapa tiene un estado: **Hecha**, **En curso** o **Pendiente**. Las etapas pendientes son una guía y pueden cambiar a medida que avancemos.

Como referencia, cada concepto se compara con su equivalente en .NET.

## Índice

| # | Etapa | Estado |
|:-:|:--|:-:|
| 0 | [Entorno: Node, fnm y pnpm](#etapa-0--entorno-node-fnm-y-pnpm) | Hecha |
| 1 | [Andamiaje del proyecto NestJS](#etapa-1--andamiaje-del-proyecto-nestjs) | Hecha |
| 2 | [Prisma y SQL Server](#etapa-2--prisma-y-sql-server) | Pendiente |
| 3 | [Estructura por capas y primer CRUD: Torneo](#etapa-3--estructura-por-capas-y-primer-crud-torneo) | Pendiente |
| 4 | [Validación de entrada y manejo de errores](#etapa-4--validación-de-entrada-y-manejo-de-errores) | Pendiente |
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

| Archivo | Para qué sirve | En .NET |
|:--|:--|:--|
| `package.json` | Nombre del proyecto, dependencias y scripts (`pnpm start:dev`, `pnpm test`…) | `.csproj` (las `PackageReference`) |
| `pnpm-lock.yaml` | Versiones exactas instaladas, para que todos instalen lo mismo. Se versiona y no se edita a mano | `packages.lock.json` |
| `node_modules/` | Paquetes instalados. No se versiona | Caché de paquetes NuGet |
| `.node-version` | Versión de Node del proyecto, que lee fnm | `global.json` |
| `tsconfig.json` | Configuración del compilador de TypeScript | Propiedades de compilación del `.csproj` |
| `tsconfig.build.json` | Igual que el anterior, pero excluye los tests al compilar para producción | Configuración Release |
| `nest-cli.json` | Configuración del CLI de Nest (carpeta de código, limpieza de `dist/`) | — |
| `src/main.ts` | Punto de entrada: crea la aplicación y la pone a escuchar en el puerto 3000 o en `PORT` | `Program.cs` |
| `src/app.module.ts` | Módulo raíz: registra controllers y servicios en el contenedor de inyección | Los `builder.Services.Add…` de `Program.cs` |
| `src/app.controller.ts` | Controller de ejemplo con un `GET /` que devuelve "Hello World!" | Un `Controller` |
| `src/app.service.ts` | Servicio de ejemplo que usa el controller | Un servicio registrado con `AddScoped` |
| `src/app.controller.spec.ts` | Test unitario del controller | Test de xUnit |
| `test/app.e2e-spec.ts` | Test end-to-end: levanta la app y le hace un pedido HTTP real | Test con `WebApplicationFactory` |
| `vitest.config.ts` / `vitest.config.e2e.ts` | Configuración de Vitest para tests unitarios (`*.spec.ts`) y end-to-end (`*.e2e-spec.ts`) | Proyecto de tests |
| `.oxlintrc.json` | Reglas del linter oxlint | Analizadores de Roslyn / `.editorconfig` |
| `.prettierrc` | Formato del código: comillas simples y coma final | `.editorconfig` |

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

**Estado:** Pendiente

- Instalar Prisma 7, el cliente y el adaptador de SQL Server (`@prisma/adapter-mssql`).
- Crear `prisma/schema.prisma` (ya existe un borrador), `prisma.config.ts` y `.env.example`.
- Elegir dónde se aloja la base. La cátedra exige que no se ejecute en local; la opción natural es Azure SQL Database.
- Generar y aplicar la primera migración.
- Crear un servicio de Nest que exponga el cliente de Prisma al resto de la aplicación.

## Etapa 3 — Estructura por capas y primer CRUD: Torneo

**Estado:** Pendiente

- Definir la estructura de carpetas por feature (`src/modules/torneos/`).
- Controller → servicio (casos de uso y reglas de negocio) → repositorio (acceso con Prisma).
- Endpoints REST: `GET /torneos`, `GET /torneos/:id`, `POST /torneos`, `PATCH /torneos/:id`, `DELETE /torneos/:id`.

## Etapa 4 — Validación de entrada y manejo de errores

**Estado:** Pendiente

- Validar los datos de entrada (DTOs con reglas, el equivalente a FluentValidation).
- Un filtro global de excepciones que devuelva errores en un formato JSON único, como el middleware de errores de tu trabajo.

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

- Login con al menos dos niveles de acceso y rutas protegidas.
- Tests unitarios (uno por integrante) y de integración.
- Ambientes definidos con `.env`.
