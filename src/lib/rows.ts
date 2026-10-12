import { databases, type DatabaseKey } from "./databases";

export type ParseResult =
  | { ok: true; values: unknown[] }
  | { ok: false; error: string };


export function parseRow(
  key: DatabaseKey,
  body: unknown,
): ParseResult {
 
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be an object" };
  }
  const values: unknown[] = [];
  for (const field of databases[key].fields) {
    if (!(field.name in body)) {
      return { ok: false, error: `Missing required field: ${field.name}` };
    }
    const raw = (body as Record<string, unknown>)[field.name];
    values.push(raw);
  }
  return { ok: true, values };
}