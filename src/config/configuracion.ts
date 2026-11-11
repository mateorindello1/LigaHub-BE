/**
 * Configuración de la API leída de las variables de entorno (.env).
 * Equivale a appsettings.json + IOptions<T> con ValidateOnStart en ASP.NET Core: si falta un valor
 * o es inválido, la API no arranca y el error dice qué corregir.
 */
export interface Configuracion {
  /** Cadena de conexión a SQL Server (la usan Prisma y las migraciones). */
  cadenaConexion: string;
  jwt: {
    /** Secreto con el que se firman los tokens. Nunca va en el código. */
    secreto: string;
    /** Vida del token de acceso, en el formato de la biblioteca de JWT: "15m", "1h", "1d". */
    duracion: string;
  };
  sesion: ConfiguracionSesion;
  almacenamiento: ConfiguracionAlmacenamiento;
}

/** Almacenamiento de archivos (Azure Blob Storage, o Azurite en desarrollo). */
export interface ConfiguracionAlmacenamiento {
  /**
   * Cadena de conexión. "UseDevelopmentStorage=true" apunta a Azurite (el emulador local); la de
   * una cuenta de Azure se copia del portal (Claves de acceso) y es secreta.
   */
  cadenaConexion: string;
  /** Contenedor de las fotos de perfil. Se crea solo si no existe. */
  contenedorFotos: string;
}

/** Valores de SameSite que acepta la cookie del token de refresco. */
export type SameSite = 'strict' | 'lax' | 'none';

/** Configuración de la sesión que dura más que el token de acceso (token de refresco). */
export interface ConfiguracionSesion {
  /** Vida máxima de la sesión desde el login, en milisegundos. Después hay que volver a ingresar. */
  duracionRefresco: number;
  /**
   * SameSite de la cookie del token de refresco. "strict" alcanza si el frontend y la API están
   * en el mismo sitio (por ejemplo, localhost:5173 y localhost:3000); "none" hace falta si están
   * en dominios distintos.
   */
  sameSite: SameSite;
}

/** Largo mínimo del secreto de los tokens: 32 caracteres (256 bits si son aleatorios). */
const LARGO_MINIMO_SECRETO = 32;

/** Duración por defecto del token de acceso si no se configura JWT_DURACION. */
const DURACION_POR_DEFECTO = '15m';

/** Duración por defecto de la sesión (token de refresco) si no se configura REFRESCO_DURACION. */
const DURACION_REFRESCO_POR_DEFECTO = '7d';

/** Milisegundos de cada unidad de duración. */
const MILISEGUNDOS_POR_UNIDAD: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Convierte una duración como "15m" o "7d" a milisegundos.
 * Devuelve null si no tiene el formato: un número seguido de s, m, h o d.
 */
export function aMilisegundos(duracion: string): number | null {
  const partes = /^(\d+)([smhd])$/.exec(duracion);
  return partes ? Number(partes[1]) * MILISEGUNDOS_POR_UNIDAD[partes[2]] : null;
}

/**
 * Lee y valida la configuración. Lanza un error con todos los problemas juntos, para no tener
 * que corregirlos de a uno.
 * @param variables variables de entorno (por defecto, process.env). Los tests pasan las suyas.
 */
export function leerConfiguracion(
  variables: NodeJS.ProcessEnv = process.env,
): Configuracion {
  const errores: string[] = [];

  const cadenaConexion = variables.DATABASE_URL?.trim() ?? '';
  if (!cadenaConexion) {
    errores.push('Falta DATABASE_URL (cadena de conexión a SQL Server).');
  }

  const secreto = variables.JWT_SECRET?.trim() ?? '';
  if (!secreto) {
    errores.push('Falta JWT_SECRET (secreto para firmar los tokens).');
  } else if (secreto.length < LARGO_MINIMO_SECRETO) {
    errores.push(
      `JWT_SECRET debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres.`,
    );
  }

  const duracion = variables.JWT_DURACION?.trim() || DURACION_POR_DEFECTO;
  if (aMilisegundos(duracion) === null) {
    errores.push(
      `JWT_DURACION tiene un formato inválido ("${duracion}"). Ejemplos: 15m, 1h.`,
    );
  }

  const duracionRefresco =
    variables.REFRESCO_DURACION?.trim() || DURACION_REFRESCO_POR_DEFECTO;
  const duracionRefrescoMs = aMilisegundos(duracionRefresco);
  if (duracionRefrescoMs === null) {
    errores.push(
      `REFRESCO_DURACION tiene un formato inválido ("${duracionRefresco}"). Ejemplos: 7d, 12h.`,
    );
  }

  const sameSite = (variables.COOKIE_SAMESITE?.trim().toLowerCase() ||
    'strict') as SameSite;
  if (!['strict', 'lax', 'none'].includes(sameSite)) {
    errores.push(
      `COOKIE_SAMESITE tiene un valor inválido ("${sameSite}"). Valores: strict, lax o none.`,
    );
  }

  const cadenaAlmacenamiento =
    variables.AZURE_STORAGE_CONNECTION_STRING?.trim() ?? '';
  if (!cadenaAlmacenamiento) {
    errores.push(
      'Falta AZURE_STORAGE_CONNECTION_STRING (almacenamiento de archivos). En desarrollo: UseDevelopmentStorage=true (Azurite).',
    );
  }

  const contenedorFotos =
    variables.AZURE_STORAGE_CONTENEDOR_FOTOS?.trim() || 'fotos-perfil';
  // Regla de Azure: de 3 a 63 caracteres, minúsculas, números y guiones.
  if (!/^[a-z0-9](?!.*--)[a-z0-9-]{1,61}[a-z0-9]$/.test(contenedorFotos)) {
    errores.push(
      `AZURE_STORAGE_CONTENEDOR_FOTOS tiene un nombre inválido ("${contenedorFotos}"): de 3 a 63 caracteres, minúsculas, números y guiones.`,
    );
  }

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida en .env:\n- ${errores.join('\n- ')}`,
    );
  }

  return {
    cadenaConexion,
    jwt: { secreto, duracion },
    sesion: { duracionRefresco: duracionRefrescoMs!, sameSite },
    almacenamiento: {
      cadenaConexion: cadenaAlmacenamiento,
      contenedorFotos,
    },
  };
}
