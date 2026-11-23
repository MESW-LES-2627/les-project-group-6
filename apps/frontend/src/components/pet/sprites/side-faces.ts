import type { Layer, PetMood } from './types';

/** Body offset (px) per walk frame; faces and overlays move with it. */
export const WALK_BOB = [0, -1, 0, -1];

/** Faces for the side (walking) pose. Starving pets do not walk. */
export const SIDE_FACES: Record<Exclude<PetMood, 'starving'>, Layer> = {
  neutral: {
    x: 22,
    y: 9,
    rows: [
      '..........',
      '...ee.....',
      '..ehee....',
      '..eeee....',
      '...ee..n..',
      '..........',
      '.......m..',
      '..........',
    ],
  },
  happy: {
    x: 22,
    y: 9,
    rows: [
      '..........',
      '...ee.....',
      '..ehee....',
      '..eeee....',
      '..sees.n..',
      '..ss......',
      '......mm..',
      '.......q..',
    ],
  },
  sad: {
    x: 22,
    y: 9,
    rows: [
      '....m.....',
      '..mm......',
      '..eeee....',
      '..ehee....',
      '...ee..n..',
      '..t.......',
      '..T....m..',
      '......m...',
    ],
  },
};
