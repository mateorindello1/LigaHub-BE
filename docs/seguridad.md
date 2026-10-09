# Seguridad — decisiones de diseño

Decisiones tomadas el 2026-10-09. La implementación se hace en dos tiempos:

- **Para la regularidad** (no exige login): medidas generales de la API y permisos documentados en cada endpoint.
- **Para la aprobación directa:** login, guards de autenticación y de roles, y protección de rutas en el frontend.

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

**Por pertenencia:** algunas acciones dependen de que el recurso sea del usuario (por ejemplo, un jugador solo modifica *sus* datos). Se valida en el servicio comparando `Usuario.jugadorId` con el recurso. Equivale a una policy con `IAuthorizationHandler` basada en el recurso.

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
| Modificar sus propios datos | | ✓ | | ✓ |
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
| **Permisos documentados** | Cada endpoint lleva desde el principio el decorador `@Roles(...)` o `@Publico()`. Sin el guard activo no tienen efecto, pero cuando se active el login los permisos ya están definidos | Atributos `[Authorize]` |

## Para la aprobación directa

- `POST /auth/login` con **límite de intentos** (`@nestjs/throttler`) contra fuerza bruta.
- Mensaje de login genérico: "Credenciales inválidas", sin indicar si falló el email o la contraseña.
- Activar el guard global de autenticación y el guard de roles.
- Seed del primer administrador.
- En el frontend: pantalla de login, envío del token en el servicio de API y rutas protegidas según rol.

## Pendientes a futuro

- **Documentación de la inscripción del jugador** (certificado médico, deslinde de responsabilidad y otros): requiere ampliar el modelo (por ejemplo, una entidad de documentos asociada a `InscripcionJugador`) y definir dónde se guardan los archivos (almacenamiento de blobs, no la base). Hay que validar tipo y tamaño de los archivos subidos y que solo el propio jugador y los administradores puedan verlos.
- **Más datos del jugador**: la entidad `Jugador` puede crecer; el permiso de modificar sus propios datos aplica a los campos que se agreguen, salvo los que defina el administrador.
- Revisar tokens de refresco y cookie `httpOnly`.
