/** Valeur acceptée par {@link cx} : les valeurs « falsy » sont ignorées. */
export type ClassValue = string | number | false | null | undefined;

/**
 * Concatène des noms de classes CSS en ignorant les valeurs vides.
 *
 * @example cx('btn', isActive && 'is-active', size === 'sm' && 'btn-sm')
 */
export function cx(...values: ClassValue[]): string {
  let result = '';
  for (const value of values) {
    if (!value && value !== 0) continue;
    result = result ? `${result} ${value}` : String(value);
  }
  return result;
}
