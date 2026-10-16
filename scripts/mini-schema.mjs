// Minimal JSON Schema subset validator (no dependencies).
// Supports: type, required, properties, additionalProperties, enum, pattern,
// minLength, maxLength, minItems, uniqueItems, items, minimum, maximum.
const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v);

export function validate(schema, value, path = '$') {
  const errors = [];
  const err = (msg) => errors.push(`${path}: ${msg}`);
  if (schema.enum && !schema.enum.includes(value)) err(`must be one of ${schema.enum.join(', ')}; got ${JSON.stringify(value)}`);
  if (schema.type) {
    const t = typeOf(value);
    const ok = schema.type === t || (schema.type === 'number' && t === 'integer');
    if (!ok) { err(`expected ${schema.type}, got ${t}`); return errors; }
  }
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) err(`shorter than ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) err(`longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err(`does not match ${schema.pattern}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) err(`below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) err(`above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) err(`fewer than ${schema.minItems} items`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) err('items not unique');
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    for (const k of schema.required || []) if (!(k in value)) err(`missing required "${k}"`);
    const props = schema.properties || {};
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) errors.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) err(`unexpected field "${k}"`);
      else if (typeof schema.additionalProperties === 'object') errors.push(...validate(schema.additionalProperties, v, `${path}.${k}`));
    }
  }
  return errors;
}
