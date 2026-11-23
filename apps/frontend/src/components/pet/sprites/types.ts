/** The pets a reader can choose from. */
export type PetAnimal = 'cat' | 'dog' | 'fox' | 'rabbit';

/** Moods that come from how recently the reader read. */
export type PetMood = 'happy' | 'neutral' | 'sad' | 'starving';

/** Every face a pet can show: its mood, `love` right after a click, or `sleep` when napping. */
export type PetFace = PetMood | 'love' | 'sleep';

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
  /** Side pose walking right, one grid per frame, ears up and ears down. */
  walkUp: Grid[];
  walkDown: Grid[];
  /** Drawn over the side face (e.g. the dog's glasses seen from the side). */
  walkOverlay?: Layer;
}

/** Moods a pet can walk in; starving pets stay put. */
export type WalkMood = Exclude<PetMood, 'starving'>;

/** A ready-to-draw sprite. */
export interface Sprite {
  grid: Grid;
  palette: Record<string, string>;
}
