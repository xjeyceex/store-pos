import type { ZodError } from "zod";

/** Version-safe extraction of field errors from a ZodError (uses .issues). */
export function fieldErrorsFromZod(
  error: ZodError
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_root";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid data";
}
