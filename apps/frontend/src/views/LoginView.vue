<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { safeRedirect } from '@/utils/redirect';
import { session } from '@/stores/session';

const router = useRouter();
const route = useRoute();
const mode = ref<'login' | 'signup'>('login');
const login = reactive({ identifier: '', password: '', remember: false });
const signup = reactive({ displayName: '', username: '', email: '', password: '' });
const pending = ref<'login' | 'signup' | null>(null);
const loginMessage = ref(session.state.error ?? '');
const signupMessage = ref('');
const loginError = ref(Boolean(session.state.error));
const signupError = ref(false);

async function enterApp() {
  if (session.state.status === 'ready') {
    await router.push(safeRedirect(route.query.redirect) ?? '/home');
  } else if (session.state.status === 'profile-required') {
    await router.push({ name: 'complete-profile' });
  } else {
    throw new Error(session.state.error ?? 'Unable to sign in. Please try again.');
  }
}

async function submit(kind: 'login' | 'signup') {
  if (pending.value) return;
  const message = kind === 'login' ? loginMessage : signupMessage;
  const errorState = kind === 'login' ? loginError : signupError;
  message.value = '';
  errorState.value = false;
  pending.value = kind;
  try {
    if (kind === 'login') {
      await session.signIn({ ...login });
      login.password = '';
      await enterApp();
    } else {
      const outcome = await session.signUp({ ...signup });
      signup.password = '';
      if (outcome === 'authenticated') await enterApp();
      else message.value = 'Check your email to confirm your account before logging in.';
    }
  } catch (error) {
    errorState.value = true;
    message.value = error instanceof Error ? error.message : 'Unable to sign in. Please try again.';
  } finally {
    pending.value = null;
  }
}
</script>

<template>
  <div class="auth-page">
    <section class="band" aria-labelledby="auth-title">
      <div class="plate">
        <a class="brand" href="/login">
          <svg width="14" height="22" viewBox="0 0 14 22" aria-hidden="true">
            <path d="M1 1h12v19.5l-6-4.6-6 4.6z" fill="currentColor" />
          </svg>
          <span>Bookmarked</span>
        </a>

        <div class="welcome">
          <h1 id="auth-title">Welcome to Bookmarked</h1>
          <p class="intro">
            Time your reading, keep your library in order, and read alongside friends in challenges
            and book clubs.
          </p>
          <figure class="quote">
            <blockquote>“I declare after all there is no enjoyment like reading!”</blockquote>
            <figcaption>Jane Austen, <cite>Pride and Prejudice</cite></figcaption>
          </figure>
        </div>

        <p class="tagline">A reading tracker for you and your friends</p>
      </div>
    </section>

    <div class="side">
      <main class="forms">
        <div class="page-tabs" role="group" aria-label="Log in or create an account">
          <button
            type="button"
            :class="['page-tab', { active: mode === 'login' }]"
            :aria-pressed="mode === 'login'"
            @click="mode = 'login'"
          >
            Log in
          </button>
          <button
            type="button"
            :class="['page-tab', { active: mode === 'signup' }]"
            :aria-pressed="mode === 'signup'"
            @click="mode = 'signup'"
          >
            Create account
          </button>
        </div>

        <form
          v-show="mode === 'login'"
          class="auth-form"
          aria-labelledby="login-title"
          :aria-busy="pending === 'login'"
          @submit.prevent="submit('login')"
        >
          <h2 id="login-title">Welcome back</h2>
          <label class="field" for="login-identifier">
            <span>Email or username</span>
            <input
              id="login-identifier"
              v-model="login.identifier"
              class="field-input"
              name="username"
              autocomplete="username"
              placeholder="you@example.com"
              required
            />
          </label>
          <label class="field" for="login-password">
            <span>Password</span>
            <input
              id="login-password"
              v-model="login.password"
              class="field-input"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>
          <div class="options">
            <label class="remember">
              <input v-model="login.remember" type="checkbox" /> Keep me signed in
            </label>
            <button
              class="link-button"
              type="button"
              @click="
                loginMessage = 'Password recovery is not available yet.';
                loginError = false;
              "
            >
              Forgot password?
            </button>
          </div>
          <button class="button submit" type="submit" :disabled="pending !== null">
            {{ pending === 'login' ? 'Logging in…' : 'Log in' }}
          </button>
          <p
            v-if="loginMessage"
            :role="loginError ? 'alert' : 'status'"
            :class="['message', { error: loginError }]"
          >
            {{ loginMessage }}
          </p>
          <p class="switch">
            New here?
            <button type="button" class="link-button" @click="mode = 'signup'">
              Create an account
            </button>
          </p>
        </form>

        <form
          v-show="mode === 'signup'"
          class="auth-form"
          aria-labelledby="signup-title"
          :aria-busy="pending === 'signup'"
          @submit.prevent="submit('signup')"
        >
          <h2 id="signup-title">Create your account</h2>
          <label class="field" for="signup-name">
            <span>Display name</span>
            <input
              id="signup-name"
              v-model="signup.displayName"
              class="field-input"
              name="name"
              autocomplete="name"
              placeholder="Firstname Lastname"
              required
            />
          </label>
          <label class="field" for="signup-username">
            <span>Username</span>
            <input
              id="signup-username"
              v-model="signup.username"
              class="field-input"
              name="username"
              autocomplete="username"
              placeholder="yourname"
              pattern="@?[A-Za-z0-9_.]{3,50}"
              aria-describedby="username-help"
              required
            />
            <small id="username-help" class="help">
              3 to 50 letters, numbers, dots or underscores
            </small>
          </label>
          <label class="field" for="signup-email">
            <span>Email</span>
            <input
              id="signup-email"
              v-model="signup.email"
              class="field-input"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label class="field" for="signup-password">
            <span>Password</span>
            <input
              id="signup-password"
              v-model="signup.password"
              class="field-input"
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="12"
              placeholder="At least 12 characters"
              required
            />
          </label>
          <button class="button submit" type="submit" :disabled="pending !== null">
            {{ pending === 'signup' ? 'Creating account…' : 'Create account' }}
          </button>
          <p
            v-if="signupMessage"
            :role="signupError ? 'alert' : 'status'"
            :class="['message', { error: signupError }]"
          >
            {{ signupMessage }}
          </p>
          <p class="switch small">By joining, you agree to the Terms and Privacy Policy.</p>
        </form>

        <p class="privacy">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>Your profile starts private. Only friends you accept can see it.</span>
        </p>
      </main>

      <footer class="footer">© 2026 Bookmarked · Privacy · Terms · Help</footer>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-height: 100vh;
}

.band {
  display: flex;
  padding: 14px;
  background: var(--color-primary);
  color: var(--color-on-primary-strong);
}

.band :focus-visible {
  outline-color: var(--color-on-primary-strong);
}

.plate {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-12);
  min-width: 0;
  padding: 36px 44px var(--space-8);
  border: 1px solid rgb(255 230 167 / 25%);
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
  align-self: flex-start;
  color: var(--color-on-primary-strong);
  font-size: var(--font-size-md);
  font-weight: 650;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.brand svg {
  color: var(--color-cream);
}

.brand:hover {
  color: var(--color-on-primary-strong);
}

.welcome {
  max-width: 460px;
}

h1 {
  margin: 0;
  color: var(--color-on-primary-strong);
  font-family: var(--font-body);
  font-size: var(--font-size-2xl);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.015em;
}

.intro {
  margin: 14px 0 0;
  color: var(--color-on-primary);
  font-size: 1.0625rem;
}

.quote {
  margin: 36px 0 0;
}

blockquote {
  margin: 0;
  color: var(--color-on-primary-strong);
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

figcaption {
  margin-top: var(--space-2);
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
}

cite {
  font-family: var(--font-heading);
}

.tagline {
  margin: 0;
  color: var(--color-on-primary);
  font-size: var(--font-size-xs);
}

.side {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--space-8);
  padding: var(--space-12) var(--space-8) 28px;
}

.forms {
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding: 0;
}

.forms .page-tabs {
  margin-bottom: var(--space-8);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

h2 {
  margin: 0 0 var(--space-1);
  font-family: var(--font-body);
  font-size: var(--font-size-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
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

.options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.remember {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  min-height: 32px;
  cursor: pointer;
}

.remember input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--color-primary);
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

.switch.small {
  font-size: var(--font-size-xs);
}

.privacy {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: var(--space-8) 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.privacy svg {
  flex: none;
  margin-top: 2px;
}

.footer {
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  text-align: center;
}

@media (max-width: 899px) {
  .auth-page {
    grid-template-columns: minmax(0, 1fr);
  }

  .band {
    padding: 10px;
  }

  .plate {
    gap: var(--space-8);
    padding: var(--space-6) 18px;
  }

  h1 {
    font-size: var(--font-size-xl);
  }

  .side {
    padding: var(--space-8) var(--page-gutter) var(--space-6);
  }
}
</style>
