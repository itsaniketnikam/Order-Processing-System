import { ValueTransformer } from 'typeorm';

/**
 * Postgres returns NUMERIC/DECIMAL columns as strings via node-postgres to
 * preserve precision. For ordinary monetary amounts that fit in a JS number
 * (decimal(10,2) max = ~99,999,999.99) we want them hydrated as `number` so
 * services and serializers don't have to `parseFloat` everywhere.
 *
 * For arbitrary-precision needs (very large totals, crypto, etc.) switch to
 * a bignumber-backed transformer instead.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : parseFloat(value),
};
