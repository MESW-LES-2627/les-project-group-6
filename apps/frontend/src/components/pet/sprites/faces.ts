import type { Layer, PetFace } from './types';

/** Colours shared by every pet (outline, eyes, mouth, blush, tears, heart). */
export const SHARED_PALETTE: Record<string, string> = {
  o: '#432818',
  e: '#2b1a12',
  h: '#ffffff',
  m: '#432818',
  s: '#f2a29a',
  t: '#a8dcf7',
  T: '#4a9ed8',
  q: '#e8706a',
  H: '#e0445a',
  J: '#ff9aa8',
  g: '#bb9457',
  G: '#8f6e3e',
};

/** Faces are drawn over the head; same position on every pet. */
export const FACES: Record<PetFace, Layer> = {
  neutral: {
    x: 6,
    y: 10,
    rows: [
      '....................',
      '....................',
      '....................',
      '...ee..........ee...',
      '..ehee........ehee..',
      '..eeee........eeee..',
      '...ee....nn....ee...',
      '.........mm.........',
      '....................',
      '....................',
    ],
  },
  happy: {
    x: 6,
    y: 10,
    rows: [
      '....................',
      '....................',
      '....................',
      '...ee..........ee...',
      '..ehee........ehee..',
      '..eeee........eeee..',
      '...ee....nn....ee...',
      '.ss.....mmmm.....ss.',
      '.ss.....mqqm.....ss.',
      '.........mm.........',
    ],
  },
  sad: {
    x: 6,
    y: 10,
    rows: [
      '....................',
      '....mm........mm....',
      '..mm............mm..',
      '....................',
      '..eeee........eeee..',
      '..ehee........ehee..',
      '...ee....nn....ee...',
      '..t......mm.........',
      '..T.....m..m........',
      '....................',
    ],
  },
  starving: {
    x: 6,
    y: 10,
    rows: [
      '..................t.',
      '.................tT.',
      '.................TT.',
      '....................',
      '..mmmm........mmmm..',
      '..eeee........eeee..',
      '...dd....nn....dd...',
      '.........mm.........',
      '........m..m........',
      '.........mm.........',
    ],
  },
  love: {
    x: 6,
    y: 10,
    rows: [
      '....................',
      '....................',
      '....................',
      '....................',
      '...ee..........ee...',
      '..e..e........e..e..',
      '.........nn.........',
      '.ss.....mmmm.....ss.',
      '.sss....mqqm....sss.',
      '.........mm.........',
    ],
  },
};

/** "Grumbling stomach" marks shown next to a starving pet. */
export const RUMBLE: Layer = { x: 1, y: 21, rows: ['mm..', '..mm', '....', 'mm..', '..mm'] };

/** Heart that floats up when the pet is clicked (9x8, drawn on its own). */
export const HEART: string[] = [
  '.oo...oo.',
  'oHHo.oHHo',
  'oJHHoHHHo',
  'oHHHHHHHo',
  '.oHHHHHo.',
  '..oHHHo..',
  '...oHo...',
  '....o....',
];
