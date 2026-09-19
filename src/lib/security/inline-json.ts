/** Serialize data for a script element without allowing HTML to terminate it. */
export function serializeInlineJson(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError('Inline script data must be JSON serializable');
  }
  const escaped: Record<string, string> = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
  };
  return serialized.replace(
    /[<>&\u2028\u2029]/g,
    (character) => escaped[character]
  );
}
