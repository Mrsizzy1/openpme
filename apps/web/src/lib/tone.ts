/**
 * Tons sémantiques du système de design. Chaque ton dispose des jetons CSS
 * `--<ton>` (couleur pleine), `--<ton>-fg`, `--<ton>-bg` et `--<ton>-border`.
 */
export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export const TONES: readonly Tone[] = ['primary', 'success', 'warning', 'danger', 'info', 'neutral'];
