/**
 * Keep only allow-listed keys (dropping undefined). Use before passing request bodies to
 * QueryHelper.update so callers cannot overwrite household_id, ids, timestamps or other columns.
 */
export function pickFields<T extends Record<string, any>>(data: T | null | undefined, allowed: readonly string[]): Partial<T> {
  const out: Record<string, any> = {};
  if (!data) return out as Partial<T>;
  for (const key of allowed) {
    if (data[key] !== undefined) out[key] = data[key];
  }
  return out as Partial<T>;
}

export function notFoundError(message: string, code: string): Error {
  const error: any = new Error(message);
  error.status = 404;
  error.code = code;
  return error;
}
