# Seguridad — decisiones de diseño

Decisiones tomadas el 2026-10-09. La implementación se hace en dos tiempos:

- **Para la regularidad** (no exige login): medidas generales de la API y permisos documentados en cada endpoint.
- **Etapa de seguridad**, previa al resto de la aprobación directa: login, guards de autenticación y de roles, y protección de rutas en el frontend. Subetapas S-1 a S-6 en el [plan de desarrollo](plan-de-desarrollo.md#etapa-9--seguridad-autenticación-y-autorización).

Las decisiones marcadas como "a revisar" se tomaron por simplicidad y pueden mejorarse más adelante.

## Autenticación

| Tema | Decisión | Equivalente en .NET |
|:--|:--|:--|
| Mecanismo | Propio, con **JWT**. `POST /auth/login` recibe email y contraseña y devuelve un token de acceso firmado. El frontend lo envía en cada pedido en el encabezado `Authorization: Bearer <token>`. En Nest: `@nestjs/jwt` | `AddAuthentication().AddJwtBearer()` |
| Contraseñas | Hash con **Argon2id** (recomendación de [OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)), con el paquete `@node-rs/argon2` (precompilado: no requiere compilar ni aprobar scripts en pnpm). Se guarda en `Usuario.contraseniaHash` | `PasswordHasher<T>` de Identity |
| Duración del token de acceso | **15 minutos** (`JWT_DURACION`). El frontend lo renueva solo, sin que el usuario lo note | `ExpireTimeSpan` del bearer |
| Tokens de refresco | **Sí, desde S-7.** Un valor aleatorio de 256 bits en una cookie `httpOnly`, con **rotación** (cada uso lo reemplaza) y **detección de reutilización** (presentar uno ya usado revoca toda la sesión). La sesión dura como máximo 7 días desde el login (`REFRESCO_DURACION`) | Refresh tokens de Identity / `SlidingExpiration` de la cookie |
| Dónde guarda el token el frontend | **Token de acceso solo en memoria** (se pierde al recargar y se recupera con la cookie). **Token de refresco en una cookie `httpOnly`**, que el JavaScript no puede leer. Antes de S-7 el token se guardaba en `sessionStorage`, al alcance de un ataque XSS | Cookie de autenticación con `HttpOnly` |
| Cookie | `ligahub_refresco`: `HttpOnly`, `Secure`, `SameSite=Strict` (`COOKIE_SAMESITE`) y `Path=/auth`, así que el navegador la envía solo a los endpoints de autenticación | `CookieOptions` |
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
| Tokens de refresco en cookie `httpOnly` con rotación y detección de reutilización; token de acceso de 15 minutos solo en memoria; cierre de sesión que revoca en la API; cambio de contraseña y baja de usuario que revocan sus sesiones | Hecho (S-7) |
| Los roles se leen de la base en cada pedido: un cambio de rol o una baja rigen enseguida, sin esperar a que venza el token | Hecho (S-6) |
| Permiso por pertenencia: el rol Jugador ve y modifica solo su jugador (403 con cualquier otro id, exista o no) | Hecho (AD-2) |
| Planteles públicos sin datos personales: el listado de jugadores de un equipo no incluye DNI, email ni teléfono | Hecho (AD-2) |
| Permiso del Asistente: carga y anula resultados y eventos de los partidos (`PUT` y `DELETE /partidos/:id/resultado`) | Hecho (AD-4) |

## Tokens de refresco (S-7)

### Cómo funciona

| Paso | Qué pasa |
|:--|:--|
| Login (`POST /auth/login`) | La API devuelve el **token de acceso** (JWT de 15 minutos) en el cuerpo y deja el **token de refresco** en la cookie `ligahub_refresco`. En la base guarda solo el hash SHA-256 del token de refresco, con un `familiaId` nuevo que identifica la sesión |
| Pedidos | El frontend envía el token de acceso en `Authorization: Bearer`. La cookie no viaja: su `Path` es `/auth` |
| Renovación (`POST /auth/refrescar`) | Cuando el token de acceso está por vencer, o la API responde 401, el frontend llama a este endpoint. El navegador envía la cookie solo. La API marca el token como usado, guarda uno nuevo de la misma familia y devuelve otro token de acceso y otra cookie |
| Recarga de la página | El token de acceso estaba en memoria y se pierde. Al abrir, el frontend llama a `/auth/refrescar` y recupera la sesión |
| Cierre de sesión (`POST /auth/cerrar-sesion`) | La API revoca toda la familia y borra la cookie. Las demás pestañas también cierran (`BroadcastChannel`) |
| Cambio de contraseña o baja de usuario | Se revocan (o borran) todos sus tokens de refresco: con la contraseña vieja no se puede seguir |

### Por qué así

- **Frente a XSS:** un script inyectado en la página no puede leer la cookie `httpOnly`, y el token de acceso no está en `sessionStorage` ni en `localStorage`. Lo más que podría hacer es usar la sesión mientras la página está abierta, pero no llevarse un token para usarlo después.
- **Token de acceso corto:** si igual se filtra uno, sirve 15 minutos.
- **Rotación y detección de reutilización:** cada token de refresco sirve una vez. Si aparece uno ya usado, alguien tiene una copia (el usuario legítimo o el atacante): se revoca la familia completa y los dos tienen que volver a iniciar sesión. Es lo que recomienda la [especificación de OAuth 2.0 para aplicaciones en el navegador](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps) y el [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700#section-4.14.2).
- **Hash en la base:** quien lea la tabla `TokenRefresco` no puede usar los tokens. Alcanza con SHA-256 (no hace falta Argon2) porque el token es aleatorio de 256 bits: no se puede adivinar probando.
- **Vencimiento fijo de la sesión:** el token nuevo hereda el vencimiento del anterior, así que una sesión dura como máximo 7 días desde el login, aunque se use todos los días.
- **CSRF:** con `SameSite=Strict` el navegador no envía la cookie en pedidos que salen de otro sitio. Además, CORS solo acepta los orígenes de `CORS_ORIGIN`, así que otro sitio no puede leer la respuesta de `/auth/refrescar`.
- **Pedidos simultáneos:** como cada token sirve una vez, dos refrescos a la vez cortarían la sesión. El frontend los unifica: en la misma pestaña con una sola promesa compartida, y entre pestañas con un bloqueo del navegador ([Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)). En la API, la rotación marca el token como usado solo si seguía vigente (`UPDATE ... WHERE fechaHoraRevocacion IS NULL`), así que de dos pedidos simultáneos uno solo lo consigue.

### Para el deploy (AD-6)

Si el frontend y la API se publican en dominios distintos (por ejemplo, `*.azurestaticapps.net` y `*.azurewebsites.net`), la cookie pasa a ser de terceros:
- Hay que configurar `COOKIE_SAMESITE=none`, y la protección CSRF queda solo en CORS.
- Safari bloquea las cookies de terceros por defecto, y otros navegadores pueden hacerlo según la configuración del usuario. La sesión no sobreviviría a una recarga.

La solución es que el navegador vea los dos en el mismo sitio: un dominio propio con subdominios (por ejemplo, `app.` y `api.`), o que el hosting del frontend reenvíe `/api` a la API (Azure Static Web Apps lo permite con un backend vinculado). Se decide en AD-6.

## Pendientes a futuro

- **Documentación de la inscripción del jugador** (certificado médico, deslinde de responsabilidad y otros): requiere ampliar el modelo (por ejemplo, una entidad de documentos asociada a `InscripcionJugador`) y definir dónde se guardan los archivos (almacenamiento de blobs, no la base). Hay que validar tipo y tamaño de los archivos subidos y que solo el propio jugador y los administradores puedan verlos.
- **Más datos del jugador**: la entidad `Jugador` puede crecer; el permiso de modificar sus propios datos aplica a los campos que se agreguen, salvo los que defina el administrador.
