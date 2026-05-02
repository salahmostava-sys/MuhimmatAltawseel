// Shared validation helpers — ES module, imported by server/index.js

export const isUuid = (v) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const isValidMonth = (v) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

export const isValidDate = (v) =>
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(v);

export const VALID_ROLES = new Set(['admin', 'hr', 'finance', 'operations', 'viewer']);
