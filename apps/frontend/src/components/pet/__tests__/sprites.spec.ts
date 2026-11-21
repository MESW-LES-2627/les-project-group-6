// @req F-GAM-03
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PetSprite from '../PetSprite.vue';
import {
  composeSprite,
  drawLayer,
  fade,
  HEART,
  PET_ANIMALS,
  PET_ART,
  PET_SIZE,
  toRuns,
  type PetFace,
} from '../sprites';

const FACES: PetFace[] = ['happy', 'neutral', 'sad', 'starving', 'love'];

describe('pet sprites', () => {
  it('offers the cat, dog, fox and rabbit', () => {
    expect(PET_ANIMALS).toEqual(['cat', 'dog', 'fox', 'rabbit']);
  });

  it.each(PET_ANIMALS)('draws the %s as a 32x32 grid with ears up and down', (animal) => {
    for (const grid of [PET_ART[animal].earsUp, PET_ART[animal].earsDown]) {
      expect(grid).toHaveLength(PET_SIZE);
      for (const row of grid) expect(row).toHaveLength(PET_SIZE);
    }
  });

  it.each(PET_ANIMALS)('gives every pixel of the %s a colour in every face', (animal) => {
    for (const face of FACES) {
      const { grid, palette } = composeSprite(animal, face);
      const missing = new Set([...grid.join('')].filter((ch) => ch !== '.' && !palette[ch]));
      expect([...missing], `${animal} ${face}`).toEqual([]);
    }
  });

  it('shows a different picture for each face', () => {
    for (const animal of PET_ANIMALS) {
      const pictures = FACES.map((face) => composeSprite(animal, face).grid.join(''));
      expect(new Set(pictures).size).toBe(FACES.length);
    }
  });

  it('drops the ears when the pet is sad or starving', () => {
    const art = PET_ART.cat;
    expect(composeSprite('cat', 'sad').grid.slice(0, 8)).toEqual(art.earsDown.slice(0, 8));
    expect(composeSprite('cat', 'happy').grid.slice(0, 8)).toEqual(art.earsUp.slice(0, 8));
  });

  it('fades the fur of a starving pet but keeps the outline', () => {
    const happy = composeSprite('fox', 'happy').palette;
    const starving = composeSprite('fox', 'starving').palette;
    expect(starving.b).not.toBe(happy.b);
    expect(starving.o).toBe(happy.o);
  });

  it('draws the dog glasses over every face', () => {
    const glasses = PET_ART.dog.overlay!;
    const { grid } = composeSprite('dog', 'love');
    expect(grid[glasses.y]?.slice(glasses.x + 2, glasses.x + 6)).toBe('gggg');
  });
});

describe('sprite helpers', () => {
  it('draws a layer and skips its transparent pixels', () => {
    expect(drawLayer(['....', '....'], { x: 1, y: 1, rows: ['a.b'] })).toEqual(['....', '.a.b']);
  });

  it('ignores layer pixels outside the grid', () => {
    expect(drawLayer(['..'], { x: 1, y: 0, rows: ['ab', 'cd'] })).toEqual(['.a']);
  });

  it('fades a colour towards grey', () => {
    expect(fade('#ffffff', 0)).toBe('#ffffff');
    expect(fade('#000000', 1)).toBe('#96908c');
    expect(fade('#000000', 0.5)).toBe('#4b4846');
  });

  it('merges same-colour pixels into runs and skips transparent ones', () => {
    const runs = toRuns({ grid: ['aab.', '.bbb'], palette: { a: '#111111', b: '#222222' } });
    expect(runs).toEqual([
      { x: 0, y: 0, width: 2, color: '#111111' },
      { x: 2, y: 0, width: 1, color: '#222222' },
      { x: 1, y: 1, width: 3, color: '#222222' },
    ]);
  });

  it('keeps the heart 9 pixels wide', () => {
    for (const row of HEART) expect(row).toHaveLength(9);
  });
});

describe('PetSprite', () => {
  it('renders a crisp, decorative SVG at the requested size', () => {
    const wrapper = mount(PetSprite, { props: { animal: 'rabbit', face: 'happy', size: 96 } });
    const svg = wrapper.get('svg');
    expect(svg.attributes('width')).toBe('96');
    expect(svg.attributes('viewBox')).toBe('0 0 32 32');
    expect(svg.attributes('shape-rendering')).toBe('crispEdges');
    expect(svg.attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('rect').length).toBe(toRuns(composeSprite('rabbit', 'happy')).length);
  });

  it('redraws when the face changes', async () => {
    const wrapper = mount(PetSprite, { props: { animal: 'cat', face: 'happy' } });
    const before = wrapper.html();
    await wrapper.setProps({ face: 'starving' });
    expect(wrapper.html()).not.toBe(before);
  });
});
