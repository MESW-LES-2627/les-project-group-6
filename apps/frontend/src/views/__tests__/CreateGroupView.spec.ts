import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type { ApiChallengeGroup, CreateChallengeGroupPayload } from '@/services/api';
import CreateGroupView from '../CreateGroupView.vue';

const createChallengeGroup = vi.hoisted(() =>
  vi.fn<(payload: CreateChallengeGroupPayload) => Promise<ApiChallengeGroup>>(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  createChallengeGroup,
}));

function mountView() {
  return mount(CreateGroupView, { global: { plugins: [router] } });
}

describe('CreateGroupView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('previews the challenge as the form changes', async () => {
    const wrapper = mountView();
    const preview = wrapper.get('.glance');

    expect(preview.text()).toContain('November Pages');
    expect(preview.text()).toContain('1–30 November 2026');
    expect(preview.text()).toContain('Winner: most counted pages');

    await wrapper.get('#group-name').setValue('Winter Reads');
    await wrapper.get('#metric').setValue('minutes');

    expect(preview.text()).toContain('Winter Reads');
    expect(preview.text()).toContain('Winner: most counted minutes');
  });

  it('switches to the book club fields', async () => {
    const wrapper = mountView();

    expect(wrapper.get('.club-fields').attributes('disabled')).toBeDefined();

    await wrapper.findAll('.segment')[1]!.trigger('click');

    expect(wrapper.get('.club-fields').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('.group:not(.club-fields)').attributes('disabled')).toBeDefined();
    expect(wrapper.get('#shape-title').text()).toBe('2. Shape the book club');
  });

  it('counts the invited friends in the button', async () => {
    const wrapper = mountView();
    const submit = () => wrapper.get('button[type="submit"]').text();

    expect(submit()).toBe('Create group & send 2 invites');

    await wrapper.findAll('.friend')[2]!.trigger('click');
    expect(submit()).toBe('Create group & send 3 invites');

    await wrapper.get('#friend-search').setValue('nadia');
    expect(wrapper.findAll('.friend')).toHaveLength(1);
  });

  it('asks for a name before creating the group', async () => {
    const wrapper = mountView();

    await wrapper.get('#group-name').setValue('');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('#name-error').text()).toBe('Give your group a name.');
  });

  it('creates the challenge through the API and opens its page', async () => {
    const id = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
    createChallengeGroup.mockResolvedValueOnce({ id } as ApiChallengeGroup);
    await router.push('/groups/new');
    const wrapper = mountView();

    await wrapper.get('form').trigger('submit');

    expect(createChallengeGroup).toHaveBeenCalledWith({
      name: 'November Pages',
      startDate: '2026-11-01',
      durationDays: 30,
      winMetric: 'pages',
    });
    await vi.waitFor(() => expect(router.currentRoute.value.params.groupId).toBe(id));
  });

  it('shows the server error when the challenge cannot be created', async () => {
    createChallengeGroup.mockRejectedValueOnce(new Error('Invalid start date: 2026-02-30'));
    const wrapper = mountView();

    await wrapper.get('form').trigger('submit');

    await vi.waitFor(() => expect(wrapper.get('[role="alert"]').text()).toContain('Invalid start'));
  });

  it('returns to the groups page for a book club, which is not saved yet', async () => {
    await router.push('/groups/new');
    const wrapper = mountView();

    await wrapper.findAll('.segment')[1]!.trigger('click');
    await wrapper.get('form').trigger('submit');

    expect(createChallengeGroup).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('groups'));
  });
});
