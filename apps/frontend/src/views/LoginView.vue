<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import readingImage from '@/assets/auth/reading-by-window.png';
import { authProvider, type AuthOutcome } from '@/services/auth';

const router = useRouter();
const login = reactive({ identifier: '', password: '', remember: false });
const signup = reactive({ displayName: '', username: '', email: '', password: '' });
const pending = ref<'login' | 'signup' | null>(null);
const loginMessage = ref('');
const signupMessage = ref('');
const loginError = ref(false);
const signupError = ref(false);

async function submit(kind: 'login' | 'signup') {
  if (pending.value) return;
  const message = kind === 'login' ? loginMessage : signupMessage;
  const errorState = kind === 'login' ? loginError : signupError;
  message.value = '';
  errorState.value = false;
  pending.value = kind;
  try {
    const result: AuthOutcome =
      kind === 'login'
        ? await authProvider.signIn({ ...login })
        : await authProvider.signUp({ ...signup });
    if (kind === 'login') login.password = '';
    else signup.password = '';
    if (result === 'authenticated') await router.push('/home');
    else message.value = 'Check your email to confirm your account before logging in.';
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
    <header class="auth-header">
      <a class="auth-brand" href="/login" aria-label="Re — authentication">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5c-3-3-7-3-11-2v17c4-1 8-1 11 2m0-17c3-3 7-3 11-2v17c-4-1-8-1-11 2V5Z" />
        </svg>
        <span>Bookmarked</span>
      </a>
      <span class="muted">A home for your reading life.</span>
    </header>

    <main class="auth-layout">
      <section class="auth-intro" aria-labelledby="auth-title">
        <span class="auth-tag">TURN A NEW PAGE</span>
        <h1 id="auth-title">Good books.<br />Better company.</h1>
        <p class="auth-description muted">
          Keep your reading life in one place. Find your next book, build a little momentum, and
          read alongside people you love.
        </p>
        <img
          class="auth-photo"
          :src="readingImage"
          alt="An open book, a cup of coffee and stacked books beside a sunlit window"
          width="440"
          height="350"
        />
        <blockquote>“I declare after all there is no enjoyment like reading!”</blockquote>
        <p class="auth-attribution muted">JANE AUSTEN · PRIDE AND PREJUDICE</p>
      </section>

      <div class="auth-content">
        <div class="auth-forms">
          <form
            class="auth-card"
            aria-labelledby="login-title"
            :aria-busy="pending === 'login'"
            @submit.prevent="submit('login')"
          >
            <h2 id="login-title">Welcome back.</h2>
            <label class="auth-field" for="login-identifier">
              <span>Email address<span class="sr-only"> or username</span></span>
              <input
                id="login-identifier"
                v-model="login.identifier"
                name="username"
                autocomplete="username"
                placeholder="you@example.com"
                required
              />
            </label>
            <label class="auth-field" for="login-password">
              <span>Password</span>
              <input
                id="login-password"
                v-model="login.password"
                name="password"
                type="password"
                autocomplete="current-password"
                placeholder="Your login password"
                required
              />
            </label>
            <div class="auth-login-options">
              <label class="auth-remember"
                ><input v-model="login.remember" type="checkbox" /> Keep me signed in</label
              >
              <button
                class="auth-text-button"
                type="button"
                @click="
                  loginMessage = 'Password recovery is not available yet.';
                  loginError = false;
                "
              >
                Forgot password?
              </button>
            </div>
            <button class="button auth-submit" type="submit" :disabled="pending !== null">
              {{ pending === 'login' ? 'Logging in…' : 'Log in →' }}
            </button>
            <p
              v-if="loginMessage"
              :role="loginError ? 'alert' : 'status'"
              class="auth-message"
              :class="{ 'auth-error': loginError }"
            >
              {{ loginMessage }}
            </p>
            <p class="auth-login-note muted">
              New to Marginalia? Create your free account alongside.
            </p>
          </form>

          <form
            class="auth-card"
            aria-labelledby="signup-title"
            :aria-busy="pending === 'signup'"
            @submit.prevent="submit('signup')"
          >
            <h2 id="signup-title">Create your account</h2>
            <label class="auth-field" for="signup-name">
              <span>Display name</span>
              <input
                id="signup-name"
                v-model="signup.displayName"
                name="name"
                autocomplete="name"
                placeholder="Firstname Lastname"
                required
              />
            </label>
            <label class="auth-field" for="signup-username">
              <span>Unique username</span>
              <input
                id="signup-username"
                v-model="signup.username"
                name="username"
                autocomplete="username"
                placeholder="Your preferred unique username"
                pattern="@?[A-Za-z0-9_]+"
                aria-describedby="username-help"
                required
              />
              <small id="username-help" class="muted">Letters, numbers and underscores</small>
            </label>
            <label class="auth-field" for="signup-email">
              <span>Email address</span>
              <input
                id="signup-email"
                v-model="signup.email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                required
              />
            </label>
            <label class="auth-field" for="signup-password">
              <span>Create password</span>
              <input
                id="signup-password"
                v-model="signup.password"
                name="password"
                type="password"
                autocomplete="new-password"
                minlength="12"
                placeholder="At least 12 characters"
                aria-describedby="password-help"
                required
              />
              <small id="password-help" class="muted"
                >Use a strong password you haven’t used elsewhere.</small
              >
            </label>
            <button class="button auth-submit" type="submit" :disabled="pending !== null">
              {{ pending === 'signup' ? 'Creating account…' : 'Create account →' }}
            </button>
            <p
              v-if="signupMessage"
              :role="signupError ? 'alert' : 'status'"
              class="auth-message"
              :class="{ 'auth-error': signupError }"
            >
              {{ signupMessage }}
            </p>
            <p class="auth-terms muted">By joining, you agree to our Terms and Privacy Policy.</p>
          </form>
        </div>

        <aside class="auth-privacy">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="4" y="10" width="16" height="11" rx="1" />
            <path d="M8 10V6a4 4 0 0 1 8 0v4" />
          </svg>
          <div>
            <h3>A private beginning</h3>
            <p class="muted">
              Your profile is private by default. Only accepted friends can see it; you decide what
              to make public later. Sign in to access your library, groups and reading activity.
            </p>
          </div>
        </aside>
        <div class="auth-benefits">
          <div>
            <h3>Keep a beautiful record</h3>
            <p class="muted">Books, notes, sessions and rereads.</p>
          </div>
          <div>
            <h3>Find your rhythm</h3>
            <p class="muted">Goals, streaks and earned badges.</p>
          </div>
          <div>
            <h3>Read together</h3>
            <p class="muted">Friendly challenges and book clubs.</p>
          </div>
        </div>
      </div>
    </main>
    <footer class="auth-footer muted">
      <span>© 2026 Bookmarked</span><span>Privacy · Terms · Help</span>
    </footer>
  </div>
</template>

<style scoped>
.auth-page {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 26px var(--space-12) 0;
}
.auth-header,
.auth-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-caption);
}
.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--color-primary);
  font: var(--font-size-brand) var(--font-heading);
  text-decoration: none;
}
.auth-layout {
  display: grid;
  grid-template-columns: minmax(0, 440fr) minmax(0, 864fr);
  gap: 40px;
  padding: 62px 0 0;
}
.auth-tag {
  display: inline-block;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-cream);
  color: var(--color-primary);
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
}
.auth-intro h1 {
  margin: 24px 0;
  font-size: var(--font-size-display);
  line-height: 1;
  letter-spacing: -1px;
}
.auth-description {
  margin-bottom: 24px;
}
.auth-photo {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--radius-control);
}
.auth-intro blockquote {
  margin: 24px 0;
  font: var(--font-size-lg) / 1.4 var(--font-heading);
}
.auth-attribution {
  margin: 0;
  font-size: var(--font-size-caption);
}
.auth-forms {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
}
.auth-card {
  min-height: 568px;
  padding: 28px 27px 26px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.auth-card h2 {
  margin-bottom: 22px;
  font-size: var(--font-size-title);
  white-space: nowrap;
}
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-bottom: 18px;
  font-size: var(--font-size-caption);
  line-height: 1.25;
  font-weight: var(--font-weight-semibold);
}
.auth-field input {
  width: 100%;
  height: var(--control-height);
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
}
.auth-field input::placeholder {
  color: var(--color-text);
  opacity: 1;
}
.auth-field small {
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-normal);
}
.auth-login-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 20px;
  font-size: var(--font-size-caption);
}
.auth-remember {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.auth-remember input {
  margin: 0;
  width: 10px;
  height: 10px;
  accent-color: var(--color-primary);
}
.auth-text-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-size-caption);
  cursor: pointer;
}
.auth-submit {
  height: 42px;
  padding-inline: 18px;
  font-size: var(--font-size-sm);
}
.auth-submit:disabled {
  opacity: 0.65;
  cursor: wait;
}
.auth-login-note {
  margin: 20px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  font-size: var(--font-size-caption);
}
.auth-terms {
  margin: 16px 0 0;
  font-size: var(--font-size-2xs);
}
.auth-message {
  margin: var(--space-3) 0 0;
  font-size: var(--font-size-caption);
}
.auth-error {
  color: var(--color-error);
}
.auth-privacy {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-6);
  padding: 16px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-control);
}
.auth-privacy svg {
  flex: none;
  color: var(--color-copper);
}
.auth-privacy h3,
.auth-benefits h3 {
  margin: 0 0 5px;
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-body);
}
.auth-privacy p {
  margin: 0;
  font-size: var(--font-size-caption);
}
.auth-benefits {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin-top: var(--space-6);
}
.auth-benefits h3 {
  margin-bottom: 20px;
}
.auth-benefits p {
  margin: 0;
  font-size: var(--font-size-caption);
}
.auth-footer {
  margin-top: 84px;
  padding-bottom: 40px;
}
@media (max-width: 1199px) {
  .auth-layout {
    grid-template-columns: 1fr 2fr;
    gap: var(--space-6);
  }
  .auth-card {
    padding: 24px 20px;
  }
  .auth-card h2 {
    font-size: var(--font-size-lg);
    white-space: normal;
  }
  .auth-intro h1 {
    font-size: var(--font-size-2xl);
  }
  .auth-login-options {
    flex-wrap: wrap;
  }
}
@media (max-width: 899px) {
  .auth-page {
    padding-inline: var(--page-gutter);
  }
  .auth-layout {
    grid-template-columns: 1fr;
    padding-top: var(--space-8);
  }
  .auth-intro {
    max-width: 440px;
  }
  .auth-footer {
    margin-top: var(--space-12);
  }
}
@media (max-width: 559px) {
  .auth-forms,
  .auth-benefits {
    grid-template-columns: 1fr;
  }
  .auth-card {
    min-height: auto;
  }
  .auth-header > .muted {
    max-width: 150px;
    text-align: right;
  }
  .auth-intro h1 {
    font-size: var(--font-size-2xl);
  }
  .auth-footer {
    gap: var(--space-4);
    flex-wrap: wrap;
  }
}
</style>
