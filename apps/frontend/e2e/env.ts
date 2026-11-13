/** Reads a required e2e variable, failing with a message that names it. */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (see apps/frontend/.env.e2e.example)`);
  return value;
}

export const testUser = () => ({
  email: required('E2E_USER_EMAIL'),
  password: required('E2E_USER_PASSWORD'),
});

export const profilelessUser = () => ({
  email: required('E2E_PROFILELESS_EMAIL'),
  password: required('E2E_PROFILELESS_PASSWORD'),
});

export const fixtureBook = () => ({
  id: required('E2E_BOOK_ID'),
  title: required('E2E_BOOK_TITLE'),
});

export const fixtureGroup = () => ({
  id: required('E2E_GROUP_ID'),
  name: required('E2E_GROUP_NAME'),
});
