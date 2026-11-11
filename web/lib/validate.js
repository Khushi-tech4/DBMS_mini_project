// lib/validate.js
// Input validation helpers. The database has its own CHECK constraints too;
// this layer just gives users friendly errors first.

// Returns a number (max 2 decimals, > 0, <= 1,000,000) or null if invalid.
export function parseAmount(value) {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n <= 0 || n > 1000000) return null;
  if (Math.round(n * 100) / 100 !== n) return null;
  return n;
}

// Returns a positive integer or null.
export function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Trims text and limits its length; returns null for empty input.
export function cleanText(value, max = 255) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s ? s.slice(0, max) : null;
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
