<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute } from 'vue-router';
import { authProvider, PASSWORD_MIN_LENGTH, validEmail } from '@/services/auth';
import { session } from '@/stores/session';

const route = useRoute();
const resetting = computed(() => route.name === 'reset-password');
const email = ref('');
const password = ref('');
const confirmation = ref('');
const pending = ref(false);
const checking = ref(false);
const valid = ref(false);
const sent = ref(false);
const changed = ref(false);
const cleaned = ref(false);
const error = ref('');
const emailError = ref('');
const passwordError = ref('');
const confirmationError = ref('');

watch(
  resetting,
  async (reset) => {
    error.value = '';
    if (!reset) return;
    checking.value = true;
    try {
      valid.value = await authProvider.recoveryStatus();
    } catch {
      valid.value = false;
    } finally {
      checking.value = false;
    }
  },
  { immediate: true },
);

async function cleanup() {
  await authProvider.finishRecovery();
  cleaned.value = true;
  await session.refresh();
}

onBeforeRouteLeave(async () => {
  if (pending.value) return false;
  if (resetting.value) {
    try {
      await cleanup();
    } catch {
      error.value = 'Please retry signing out of recovery before leaving.';
      return false;
    }
  }
});

async function submit() {
  if (pending.value || checking.value) return;
  error.value = '';
  emailError.value = '';
  passwordError.value = '';
  confirmationError.value = '';
  if (!resetting.value) {
    if (!validEmail(email.value)) emailError.value = 'Enter a valid email address.';
  } else {
    if (!valid.value || changed.value) return;
    if (password.value.length < PASSWORD_MIN_LENGTH)
      passwordError.value = 'Use at least 12 characters.';
    if (!confirmation.value || confirmation.value !== password.value)
      confirmationError.value = 'Passwords must match.';
  }
  if (emailError.value || passwordError.value || confirmationError.value) return;
  pending.value = true;
  try {
    if (!resetting.value) {
      await authProvider.requestPasswordReset(email.value);
      sent.value = true;
    } else {
      await authProvider.updateRecoveryPassword(password.value);
      changed.value = true;
      password.value = '';
      confirmation.value = '';
      await cleanup();
    }
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'Unable to complete this request. Please try again.';
    if (resetting.value && !changed.value) {
      try {
        valid.value = await authProvider.recoveryStatus();
      } catch {
        valid.value = false;
      }
    }
  } finally {
    pending.value = false;
  }
}

async function retryCleanup() {
  if (pending.value) return;
  pending.value = true;
  try {
    await cleanup();
    error.value = '';
  } catch {
    error.value = 'Please retry signing out of recovery before leaving.';
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="recovery-page">
    <header>
      <RouterLink class="brand" to="/login">
        <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
          <path d="M1 1h12v19.5l-6-4.6-6 4.6z" fill="currentColor" />
        </svg>
        <span>Bookmarked</span>
      </RouterLink>
      <RouterLink class="button-outline" to="/login">← Back to login</RouterLink>
    </header>
    <main>
      <div class="intro">
        <span class="eyebrow">Account help</span>
        <h1>Let’s get you back to your books.</h1>
        <p>Reset your password securely. Your reading history stays right where you left it.</p>
      </div>
      <section
        class="recovery-card"
        :aria-busy="pending || checking"
        aria-labelledby="recovery-title"
      >
        <template v-if="checking">
          <h2 id="recovery-title">Checking your reset link</h2>
          <p role="status">Please wait…</p>
        </template>
        <template v-else-if="changed">
          <h2 id="recovery-title">Password changed</h2>
          <p role="status">Your new password is ready. Return to login to use it.</p>
          <RouterLink v-if="cleaned" class="button" to="/login">Back to login</RouterLink>
          <button v-else class="button" :disabled="pending" @click="retryCleanup">
            Finish recovery sign out
          </button>
        </template>
        <template v-else-if="resetting && !valid">
          <h2 id="recovery-title">Request a fresh reset link</h2>
          <p role="status">
            This reset link is missing, invalid, expired or already used. Request a new link to
            continue.
          </p>
          <RouterLink class="button" to="/forgot-password">Request another link</RouterLink>
        </template>
        <template v-else-if="sent && !resetting">
          <h2 id="recovery-title">Check your inbox</h2>
          <p role="status">
            If an account exists for that email address, we’ve sent password reset instructions.
          </p>
          <p class="note">Use the link within 1 hour. Check your spam folder too.</p>
          <button class="button-outline" :disabled="pending" @click="sent = false">
            Try another email
          </button>
        </template>
        <form v-else novalidate @submit.prevent="submit">
          <h2 id="recovery-title">
            {{ resetting ? 'Choose a new password' : 'Request a reset link' }}
          </h2>
          <p>
            {{
              resetting
                ? 'Choose a unique password for your account.'
                : 'Enter the email you use for Bookmarked.'
            }}
          </p>
          <template v-if="!resetting">
            <label class="field" for="recovery-email">Email address</label>
            <input
              id="recovery-email"
              v-model="email"
              class="field-input"
              type="email"
              name="email"
              autocomplete="email"
              required
              :aria-invalid="Boolean(emailError)"
              :aria-describedby="emailError ? 'email-error' : undefined"
            />
            <p v-if="emailError" id="email-error" class="error" role="alert">{{ emailError }}</p>
          </template>
          <template v-else>
            <label class="field" for="new-password">New password</label>
            <input
              id="new-password"
              v-model="password"
              class="field-input"
              type="password"
              name="password"
              autocomplete="new-password"
              :minlength="PASSWORD_MIN_LENGTH"
              required
              :aria-invalid="Boolean(passwordError)"
              aria-describedby="password-help password-error"
            />
            <small id="password-help">At least 12 characters; make it unique.</small>
            <p id="password-error" class="error" :role="passwordError ? 'alert' : undefined">
              {{ passwordError }}
            </p>
            <label class="field" for="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              v-model="confirmation"
              class="field-input"
              type="password"
              name="confirmation"
              autocomplete="new-password"
              required
              :aria-invalid="Boolean(confirmationError)"
              :aria-describedby="confirmationError ? 'confirmation-error' : undefined"
            />
            <p v-if="confirmationError" id="confirmation-error" class="error" role="alert">
              {{ confirmationError }}
            </p>
          </template>
          <button class="button submit" type="submit" :disabled="pending">
            {{ pending ? 'Please wait…' : resetting ? 'Reset password' : 'Send reset link' }}
          </button>
          <p v-if="!resetting" class="note">
            We never reveal whether an email address has an account.
          </p>
          <RouterLink v-else to="/forgot-password">Link expired? Request another link →</RouterLink>
        </form>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </section>
      <p class="safety">Never share your password or reset link.</p>
    </main>
  </div>
</template>

<style scoped>
.recovery-page {
  min-height: 100vh;
  padding: var(--space-8) var(--page-gutter);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  max-width: var(--page-max);
  margin: auto;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  text-decoration: none;
}
main {
  max-width: var(--page-max);
  margin: var(--space-14) auto 0;
}
.intro {
  max-width: 860px;
}
.eyebrow {
  display: inline-block;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-cream);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-transform: uppercase;
}
h1 {
  margin: var(--space-6) 0 var(--space-4);
  font-family: var(--font-heading);
  font-size: var(--font-size-3xl);
  font-weight: 500;
  line-height: 1.2;
}
.intro p,
small,
.note,
.safety {
  color: var(--color-text-muted);
}
.recovery-card {
  max-width: 540px;
  margin-top: var(--space-8);
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
h2 {
  margin: 0;
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: 500;
}
form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
form p {
  margin: 0 0 var(--space-2);
}
.field {
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.submit {
  align-self: flex-start;
  margin-top: var(--space-4);
}
.note {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-error);
}
button:disabled {
  opacity: 0.7;
  cursor: wait;
}
.safety {
  font-size: var(--font-size-sm);
}
@media (max-width: 599px) {
  header {
    flex-wrap: wrap;
  }
  main {
    margin-top: var(--space-8);
  }
  h1 {
    font-size: var(--font-size-xl);
  }
  .recovery-card {
    padding: var(--space-6);
  }
}
</style>
