/** The pets a reader can choose from. */
export type PetAnimal = 'cat' | 'dog' | 'fox' | 'rabbit';

/** Moods that come from how recently the reader read. */
export type PetMood = 'happy' | 'neutral' | 'sad' | 'starving';

/** Every face a pet can show: its mood, or `love` right after a click. */
export type PetFace = PetMood | 'love';

/**
 * Pixel art is stored as rows of characters. Each character is a key in a palette;
 * `.` is a transparent pixel. Rows are 32 characters wide for full sprites.
 */
export type Grid = string[];

/** A smaller grid drawn on top of a sprite at (x, y). */
export interface Layer {
  x: number;
  y: number;
  rows: Grid;
}

/** The art of one animal: palette plus its sitting pose with ears up or down. */
export interface PetArt {
  palette: Record<string, string>;
  earsUp: Grid;
  earsDown: Grid;
  /** Drawn over the face (e.g. the dog's glasses). */
  overlay?: Layer;
}

/** A ready-to-draw sprite. */
export interface Sprite {
  grid: Grid;
  palette: Record<string, string>;
}
