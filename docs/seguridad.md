# Seguridad — decisiones de diseño

Decisiones tomadas el 2026-10-09. La implementación se hace en dos tiempos:

- **Para la regularidad** (no exige login): medidas generales de la API y permisos documentados en cada endpoint.
- **Etapa de seguridad**, previa al resto de la aprobación directa: login, guards de autenticación y de roles, y protección de rutas en el frontend. Subetapas S-1 a S-6 en el [plan de desarrollo](plan-de-desarrollo.md#etapa-9--seguridad-autenticación-y-autorización).

Las decisiones marcadas como "a revisar" se tomaron por simplicidad y pueden mejorarse más adelante.

## Autenticación

| Tema | Decisión | Equivalente en .NET |
|:--|:--|:--|
| Mecanismo | Propio, con **JWT**. `POST /auth/login` recibe email y contraseña y devuelve un token firmado. El frontend lo envía en cada pedido en el encabezado `Authorization: Bearer <token>`. En Nest: `@nestjs/jwt` | `AddAuthentication().AddJwtBearer()` |
| Contraseñas | Hash con **Argon2id** (recomendación de [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)), con el paquete `@node-rs/argon2` (precompilado: no requiere compilar ni aprobar scripts en pnpm). Se guarda en `Usuario.contraseniaHash` | `PasswordHasher<T>` de Identity |
| Duración del token | Vida limitada (por ejemplo, 8 horas). Al vencer, se vuelve a iniciar sesión | `ExpireTimeSpan` |
| Tokens de refresco | **No por ahora** (a revisar) | — |
| Dónde guarda el token el frontend | **En memoria + `sessionStorage`**: la sesión termina al cerrar la pestaña (a revisar). La alternativa más segura frente a XSS es una cookie `httpOnly`, que requiere CORS con credenciales y protección CSRF | — |
| Secreto de firma | Variable de entorno `JWT_SECRET` en `.env`, nunca en el código | `appsettings` / User Secrets |
| Alta de usuarios | Sin registro libre. El primer administrador se crea con un *seed* de Prisma; los demás usuarios los crea un administrador | `HasData` / seed en `Program.cs` |

## Autorización

**Todo protegido por defecto:** un guard global exige token en todas las rutas, y las públicas se marcan explícitamente con un decorador `@Publico()`. Si se olvida proteger un endpoint, queda cerrado, no abierto. Equivale a un filtro `[Authorize]` global con `[AllowAnonymous]` en las excepciones.

**Por rol:** decorador `@Roles(Rol.Administrador, …)` en cada endpoint y un guard que compara con los roles del usuario (`UsuarioRol`). Equivale a `[Authorize(Roles = "…")]`.

**Por pertenencia:** algunas acciones dependen de que el recurso sea del usuario (por ejemplo, un jugador solo modifica *sus* datos). Se valida en el servicio comparando `Usuario.jugadorId` con el recurso. Equivale a una policy con `IAuthorizationHandler` basada en el recurso. Implementado en AD-2 para `GET` y `PATCH /jugadores/:id` (ver el [plan](plan-de-desarrollo.md#ad-2--jugador-e-inscripción-de-jugador)).

### Roles

| Rol | Valor | Quién es |
|:--|:-:|:--|
| Administrador | 1 | Organizador del torneo: gestiona todo |
| Asistente | 2 | Carga los resultados y eventos de los partidos el día del partido |
| Jugador | 3 | Jugador inscripto: consulta y actualiza su propia información |

### Permisos

| Acción | Público | Jugador | Asistente | Administrador |
|:--|:-:|:-:|:-:|:-:|
| Ver torneos, fixture, resultados y posiciones | ✓ | ✓ | ✓ | ✓ |
| Ver sus propios datos e inscripciones | | ✓ | | ✓ |
| Modificar sus propios datos de contacto (email, teléfono y dirección; el DNI y el nombre solo los cambia el Administrador) | | ✓ | | ✓ |
| (Futuro) Subir documentación de su inscripción | | ✓ | | ✓ |
| Cargar resultados y eventos de partidos | | | ✓ | ✓ |
| CRUD de torneos, equipos, jugadores, predios, canchas e inscripciones | | | | ✓ |
| Generar el fixture | | | | ✓ |
| Gestionar usuarios y roles | | | | ✓ |

## Medidas generales de la API (para la regularidad)

| Medida | Para qué | Equivalente en .NET |
|:--|:--|:--|
| Validación con **lista blanca** (`whitelist` + `forbidNonWhitelisted`) | Rechaza campos que no están en el DTO. Evita que alguien agregue, por ejemplo, `"rol": 1` a un pedido y se asigne permisos (*mass assignment*) | DTOs explícitos + FluentValidation |
| **CORS** restringido al origen del frontend (variable `CORS_ORIGIN`) | Que solo el frontend propio pueda llamar a la API desde el navegador | `AddCors` con `WithOrigins` |
| **`helmet`** | Agrega encabezados HTTP de seguridad | Middleware de headers de seguridad |
| **Respuestas sin datos sensibles** | `contraseniaHash` nunca sale en una respuesta: los repositorios seleccionan los campos a devolver | DTOs de respuesta / `Select` |
| **Errores genéricos** | El filtro global de errores no devuelve trazas ni mensajes internos de la base | `UseExceptionHandler` en producción |
| **Permisos declarados** | Cada endpoint lleva el decorador `@Roles(...)` o `@Publico()` desde la etapa 4. Desde S-3 los guards globales los aplican | Atributos `[Authorize]` |

## Etapa de seguridad (antes de la aprobación directa)

| Medida | Estado |
|:--|:--|
| Usuarios con contraseñas en Argon2id y un usuario de prueba por rol | Hecho (S-1) |
| `POST /auth/login` con mensaje genérico ("Credenciales inválidas.") y mismo tiempo de respuesta para email inexistente y contraseña incorrecta | Hecho (S-2) |
| Límite de 5 intentos de login por minuto por IP (`@nestjs/throttler`) | Hecho (S-2) |
| Guards globales de autenticación y de roles; 401 y 403 con mensajes en español | Hecho (S-3) |
| Swagger con el botón Authorize | Hecho (S-3) |
| Frontend: login, envío del token y pantallas según el rol | Hecho (S-4 y S-5) |
| Gestión de usuarios y roles por el administrador | Hecho (S-6) |
| Los roles se leen de la base en cada pedido: un cambio de rol o una baja rigen enseguida, sin esperar a que venza el token | Hecho (S-6) |
| Permiso por pertenencia: el rol Jugador ve y modifica solo su jugador (403 con cualquier otro id, exista o no) | Hecho (AD-2) |
| Planteles públicos sin datos personales: el listado de jugadores de un equipo no incluye DNI, email ni teléfono | Hecho (AD-2) |

## Pendientes a futuro

- **Documentación de la inscripción del jugador** (certificado médico, deslinde de responsabilidad y otros): requiere ampliar el modelo (por ejemplo, una entidad de documentos asociada a `InscripcionJugador`) y definir dónde se guardan los archivos (almacenamiento de blobs, no la base). Hay que validar tipo y tamaño de los archivos subidos y que solo el propio jugador y los administradores puedan verlos.
- **Más datos del jugador**: la entidad `Jugador` puede crecer; el permiso de modificar sus propios datos aplica a los campos que se agreguen, salvo los que defina el administrador.
- Revisar tokens de refresco y cookie `httpOnly`.
