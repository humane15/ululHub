/** Kode Postgres foreign_key_violation (data masih dirujuk). */
export const FK_VIOLATION = '23503'

/** Error dari database, dengan kode Postgres kalau ada. */
export class DbError extends Error {
  readonly code: string | undefined
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'DbError'
    this.code = code
  }
}

export function fail(error: { message: string; code?: string }): never {
  throw new DbError(error.message, error.code)
}
