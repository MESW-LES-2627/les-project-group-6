<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { session } from '@/stores/session';

// A Supabase account without a `users` row (e.g. sign-up confirmed by email, or
// interrupted) lands here and cannot reach other pages until this is done.
const router = useRouter();
const form = reactive({
  displayName: session.state.account?.displayName ?? '',
  username: session.state.account?.username ?? '',
});
const pending = ref(false);
const message = ref('');

async function submit() {
  if (pending.value) return;
  pending.value = true;
  message.value = '';
  try {
    await session.createProfile({ ...form });
    await router.push('/home');
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : 'Unable to save your profile. Please try again.';
  } finally {
    pending.value = false;
  }
}

async function signOut() {
  try {
    await session.signOut();
  } finally {
    await router.push({ name: 'login' });
  }
}
</script>

<template>
  <div class="complete-page">
    <main class="card">
      <p class="brand">
        <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
          <path d="M1 1h12v19.5l-6-4.6-6 4.6z" fill="currentColor" />
        </svg>
        <span>Bookmarked</span>
      </p>

      <form
        class="profile-form"
        aria-labelledby="complete-title"
        :aria-busy="pending"
        @submit.prevent="submit"
      >
        <h1 id="complete-title">Finish setting up your profile</h1>
        <p class="intro">
          You are signed in<template v-if="session.state.account?.email">
            as <strong>{{ session.state.account.email }}</strong></template
          >. Choose how other readers will see you.
        </p>

        <label class="field" for="profile-name">
          <span>Display name</span>
          <input
            id="profile-name"
            v-model="form.displayName"
            class="field-input"
            name="name"
            autocomplete="name"
            placeholder="Firstname Lastname"
            required
          />
        </label>
        <label class="field" for="profile-username">
          <span>Username</span>
          <input
            id="profile-username"
            v-model="form.username"
            class="field-input"
            name="username"
            autocomplete="username"
            placeholder="yourname"
            pattern="@?[A-Za-z0-9_.]{3,50}"
            aria-describedby="profile-username-help"
            required
          />
          <small id="profile-username-help" class="help">
            3 to 50 letters, numbers, dots or underscores
          </small>
        </label>

        <button class="button submit" type="submit" :disabled="pending">
          {{ pending ? 'Saving…' : 'Continue' }}
        </button>
        <p v-if="message" role="alert" class="message error">{{ message }}</p>
        <p class="switch">
          Not you?
          <button type="button" class="link-button" @click="signOut">Log out</button>
        </p>
      </form>
    </main>
  </div>
</template>

<style scoped>
.complete-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: var(--space-8) var(--page-gutter);
}

.card {
  width: 100%;
  max-width: 420px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 0 0 var(--space-8);
  font-size: var(--font-size-md);
  font-weight: 650;
  letter-spacing: -0.01em;
}

.brand svg {
  color: var(--color-primary);
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

h1 {
  margin: 0;
  font-family: var(--font-body);
  font-size: var(--font-size-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
}

.intro {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

.help {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: 400;
}

.submit {
  justify-content: center;
  margin-top: 6px;
}

.submit:disabled {
  opacity: 0.7;
  cursor: wait;
}

.message {
  margin: 0;
  font-size: var(--font-size-sm);
}

.message.error {
  color: var(--color-error);
}

.switch {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>
