import { CAT } from './cat';
import { DOG } from './dog';
import { FACES, RUMBLE, SHARED_PALETTE } from './faces';
import { FOX } from './fox';
import { RABBIT } from './rabbit';
import type { Grid, Layer, PetAnimal, PetArt, PetFace, Sprite } from './types';

export type { Grid, Layer, PetAnimal, PetFace, PetMood, Sprite } from './types';
export { HEART } from './faces';

export const PET_SIZE = 32;

export const PET_ART: Record<PetAnimal, PetArt> = {
  cat: CAT,
  dog: DOG,
  fox: FOX,
  rabbit: RABBIT,
};

export const PET_ANIMALS = Object.keys(PET_ART) as PetAnimal[];

/** Palette keys that belong to the pet's fur and skin; they fade when it starves. */
const FUR_KEYS = new Set('bdlwWvxXypP');
const STARVING_GREY: [number, number, number] = [150, 144, 140];

/** Draws `layer` over `grid`; transparent (`.`) pixels of the layer are skipped. */
export function drawLayer(grid: Grid, layer: Layer): Grid {
  const rows = grid.map((row) => row.split(''));
  layer.rows.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      const y = layer.y + r;
      const x = layer.x + c;
      if (ch !== '.' && rows[y] && x >= 0 && x < rows[y].length) rows[y][x] = ch;
    });
  });
  return rows.map((row) => row.join(''));
}

/** Mixes a `#rrggbb` colour towards grey; `amount` 0 keeps it, 1 is full grey. */
export function fade(hex: string, amount = 0.5): string {
  const mix = (channel: number, grey: number) => {
    const value = parseInt(hex.slice(1 + channel * 2, 3 + channel * 2), 16);
    return Math.round(value + (grey - value) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return '#' + STARVING_GREY.map((grey, channel) => mix(channel, grey)).join('');
}

/** Builds the sprite of `animal` showing `face`. */
export function composeSprite(animal: PetAnimal, face: PetFace): Sprite {
  const art = PET_ART[animal];
  const droopy = face === 'sad' || face === 'starving';
  let grid = drawLayer(droopy ? art.earsDown : art.earsUp, FACES[face]);
  if (art.overlay) grid = drawLayer(grid, art.overlay);
  if (face === 'starving') grid = drawLayer(grid, RUMBLE);

  let palette = { ...SHARED_PALETTE, ...art.palette };
  if (face === 'starving') {
    palette = Object.fromEntries(
      Object.entries(palette).map(([key, hex]) => [key, FUR_KEYS.has(key) ? fade(hex) : hex]),
    );
  }
  return { grid, palette };
}

export interface PixelRun {
  x: number;
  y: number;
  width: number;
  color: string;
}

/** Turns a grid into horizontal runs of the same colour, so the SVG needs few rects. */
export function toRuns(sprite: Sprite): PixelRun[] {
  const runs: PixelRun[] = [];
  sprite.grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row.charAt(x);
      let end = x + 1;
      while (end < row.length && row.charAt(end) === ch) end++;
      const color = sprite.palette[ch];
      if (ch !== '.' && color) runs.push({ x, y, width: end - x, color });
      x = end;
    }
  });
  return runs;
}
