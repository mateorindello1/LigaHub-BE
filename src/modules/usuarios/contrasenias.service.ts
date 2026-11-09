import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * Parámetros de Argon2id: los mínimos que recomienda OWASP (19 MiB de memoria, 2 pasadas, 1 hilo).
 * https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 *
 * Son también los valores por defecto de @node-rs/argon2, que usa Argon2id si no se indica otro
 * algoritmo; se dejan explícitos para que quede a la vista qué se usa.
 */
const OPCIONES_ARGON2 = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hash y verificación de contraseñas. Equivale a PasswordHasher<T> de ASP.NET Core Identity.
 *
 * El hash se guarda en formato PHC: "$argon2id$v=19$m=19456,t=2,p=1$<sal>$<hash>". Incluye el
 * algoritmo, los parámetros y una sal aleatoria propia de cada contraseña, así que no hace falta
 * guardar nada más; si en el futuro se suben los parámetros, los hashes viejos se siguen verificando.
 */
@Injectable()
export class ContraseniasService {
  /** Genera el hash de una contraseña para guardarlo en Usuario.contraseniaHash. */
  generarHash(contrasenia: string): Promise<string> {
    return hash(contrasenia, OPCIONES_ARGON2);
  }

  /**
   * Indica si la contraseña corresponde al hash guardado.
   * Devuelve false (no lanza) si el hash guardado está dañado o tiene otro formato.
   */
  async verificar(hashGuardado: string, contrasenia: string): Promise<boolean> {
    try {
      return await verify(hashGuardado, contrasenia);
    } catch {
      return false;
    }
  }
}
