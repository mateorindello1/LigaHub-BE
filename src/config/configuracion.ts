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
    /** Vida del token, en el formato de la biblioteca de JWT: "8h", "30m", "1d". */
    duracion: string;
  };
}

/** Largo mínimo del secreto de los tokens: 32 caracteres (256 bits si son aleatorios). */
const LARGO_MINIMO_SECRETO = 32;

/** Duración por defecto del token si no se configura JWT_DURACION. */
const DURACION_POR_DEFECTO = '8h';

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
  // Un número seguido de la unidad: s (segundos), m (minutos), h (horas) o d (días).
  if (!/^\d+[smhd]$/.test(duracion)) {
    errores.push(
      `JWT_DURACION tiene un formato inválido ("${duracion}"). Ejemplos: 8h, 30m, 1d.`,
    );
  }

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida en .env:\n- ${errores.join('\n- ')}`,
    );
  }

  return { cadenaConexion, jwt: { secreto, duracion } };
}
