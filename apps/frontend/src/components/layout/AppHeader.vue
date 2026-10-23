<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{
  initials: string;
  unreadNotifications: number;
}>();

const emit = defineEmits<{ search: [query: string] }>();

// Library, Groups and Explore have no route yet
const navItems = [
  { label: 'Home', to: '/home' },
  { label: 'Library', to: null },
  { label: 'Groups', to: null },
  { label: 'Explore', to: null },
  { label: 'Profile', to: '/profile' },
];

const query = ref('');
const searchOpen = ref(false);
const menuOpen = ref(false);
const menuRoot = ref<HTMLElement | null>(null);
const menuButton = ref<HTMLButtonElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

function submitSearch() {
  emit('search', query.value.trim());
}

function closeMenu(returnFocus = false) {
  menuOpen.value = false;
  if (returnFocus) menuButton.value?.focus();
}

function onDocumentClick(event: MouseEvent) {
  if (menuOpen.value && !menuRoot.value?.contains(event.target as Node)) closeMenu();
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) closeMenu(true);
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onDocumentKeydown);
});

const notificationsLabel = computed(() =>
  props.unreadNotifications > 0
    ? `Notifications, ${props.unreadNotifications} unread`
    : 'Notifications',
);

async function toggleSearch() {
  searchOpen.value = !searchOpen.value;
  if (searchOpen.value) {
    await nextTick();
    searchInput.value?.focus();
  }
}
</script>

<template>
  <header class="header">
    <div class="page-column bar">
      <RouterLink to="/home" class="brand">
        <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
          <path d="M1 1h12v19.5l-6-4.6-6 4.6z" fill="currentColor" />
        </svg>
        <span>Bookmarked</span>
      </RouterLink>

      <nav aria-label="Main" class="nav">
        <template v-for="item in navItems" :key="item.label">
          <RouterLink v-if="item.to" :to="item.to" class="nav-link" exact-active-class="active">
            {{ item.label }}
          </RouterLink>
          <a v-else href="#" class="nav-link">{{ item.label }}</a>
        </template>
      </nav>

      <div class="tools">
        <form
          :class="['search', { open: searchOpen }]"
          role="search"
          @submit.prevent="submitSearch"
        >
          <label for="site-search" class="sr-only">Search books, people and groups</label>
          <svg
            class="search-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="site-search"
            ref="searchInput"
            v-model="query"
            type="search"
            placeholder="Search"
          />
        </form>

        <button
          type="button"
          class="icon-button search-toggle"
          :aria-expanded="searchOpen"
          aria-controls="site-search"
          aria-label="Search"
          @click="toggleSearch"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        <button type="button" class="icon-button notifications" :aria-label="notificationsLabel">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span v-if="unreadNotifications > 0" class="badge" aria-hidden="true">
            {{ unreadNotifications > 9 ? '9+' : unreadNotifications }}
          </span>
        </button>

        <div ref="menuRoot" class="account">
          <button
            ref="menuButton"
            type="button"
            class="icon-button account-button"
            aria-label="Account menu"
            aria-haspopup="menu"
            :aria-expanded="menuOpen"
            aria-controls="account-menu"
            @click="menuOpen = !menuOpen"
          >
            <span class="avatar" aria-hidden="true">{{ initials }}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div v-if="menuOpen" id="account-menu" role="menu" aria-label="Account" class="menu">
            <a role="menuitem" href="#" class="menu-item" @click="closeMenu()">Settings</a>
            <a role="menuitem" href="#" class="menu-item" @click="closeMenu()">Privacy</a>
            <div class="menu-divider" role="separator"></div>
            <a role="menuitem" href="#" class="menu-item" @click="closeMenu()">Sign out</a>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  border-bottom: 1px solid var(--color-border);
}

.bar {
  display: flex;
  gap: var(--space-10);
  align-items: center;
  min-height: 64px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: var(--space-2) 0;
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: 650;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.brand svg {
  color: var(--color-primary);
}

.brand:hover {
  color: var(--color-text);
}

.nav {
  display: flex;
  flex: 1;
  gap: 28px;
  font-size: var(--font-size-base);
  font-weight: 500;
}

.nav-link {
  padding: 21px 0 19px;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  text-decoration: none;
}

.nav-link:hover,
.nav-link.active {
  color: var(--color-text);
}

.nav-link.active {
  border-bottom-color: var(--color-primary);
}

.tools {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-left: auto;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 11px;
  color: var(--color-text-muted);
}

.search input {
  width: 220px;
  height: 38px;
  padding: 0 var(--space-3) 0 34px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
}

.search input::placeholder {
  color: var(--color-text-muted);
}

.search input:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--control-height);
  height: var(--control-height);
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--color-surface-hover);
}

.search-toggle {
  display: none;
}

.badge {
  position: absolute;
  top: 7px;
  right: 6px;
  min-width: 17px;
  height: 17px;
  padding: 0 var(--space-1);
  border-radius: 9px;
  background: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-bg);
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-2xs);
  font-weight: 700;
  line-height: 17px;
  text-align: center;
}

.account {
  position: relative;
}

.account-button {
  gap: var(--space-1);
  padding: 0 6px;
}

.account-button svg {
  color: var(--color-text-muted);
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.menu {
  position: absolute;
  top: 50px;
  right: 0;
  z-index: 20;
  width: 200px;
  padding: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  box-shadow: var(--shadow-menu);
}

.menu-item {
  display: block;
  padding: 10px var(--space-3);
  border-radius: 4px;
  color: var(--color-text);
  text-decoration: none;
}

.menu-item:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.menu-divider {
  height: 1px;
  margin: 6px 0;
  background: var(--color-border);
}

@media (max-width: 899px) {
  .bar {
    position: relative;
    flex-wrap: wrap;
    row-gap: 0;
  }

  .nav {
    order: 3;
    width: 100%;
    gap: 22px;
    overflow-x: auto;
    border-top: 1px solid var(--color-border);
  }

  .nav-link {
    padding: var(--space-3) 0 10px;
  }

  .search {
    display: none;
  }

  /* On phones the field opens as a full-width row under the header */
  .search.open {
    position: absolute;
    top: calc(100% + var(--space-2));
    right: var(--page-gutter);
    left: var(--page-gutter);
    z-index: 15;
    display: flex;
  }

  .search.open input {
    width: 100%;
    box-shadow: var(--shadow-menu);
  }

  .search-toggle {
    display: inline-flex;
  }
}
</style>
