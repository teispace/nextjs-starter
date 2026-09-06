# Testing

Three layers, each with a job the others cannot do.

| Layer | Runs | Answers |
| :-- | :-- | :-- |
| Node tests (`*.test.ts`) | Vitest, node environment | Does this function do the right thing, including on failure? |
| Component tests (`*.test.tsx`) | Vitest, jsdom + Testing Library | Does the user see and reach the right thing? |
| End-to-end (`e2e/*.spec.ts`) | Playwright against a production build | Does the real application work when everything is wired together? |

The split into two Vitest projects is deliberate: booting jsdom dominated the
run when everything shared one environment. Name a file `.test.ts` and it
runs in node; name it `.test.tsx` and it gets a DOM. A node-style test that
needs a DOM anyway can opt in with `// @vitest-environment jsdom` at the top.

Tests live next to the code they cover. `pnpm test` runs both projects,
`pnpm test:watch` keeps them running, and `pnpm test:coverage` enforces the
thresholds in `vitest.config.ts`.

## Intercept HTTP, do not mock the client

The HTTP client is the thing most worth trusting, so tests exercise the real
one and fake the network underneath with MSW:

```ts
import { setupServer } from 'msw/node';
import { http as mswHttp, HttpResponse } from 'msw';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('returns a failed result when the API rejects', async () => {
  server.use(
    mswHttp.get('*/invoices', () =>
      HttpResponse.json({ message: 'nope' }, { status: 403 }),
    ),
  );

  const result = await http.get(AppApis.invoice.list);

  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.isForbidden()).toBe(true);
});
```

`onUnhandledRequest: 'error'` is worth keeping. A test that silently reaches
the real network is a test that will fail on a plane.

Mocking the client instead would test your mock. The rule: fake the network,
never the layer under test.

## Testing the data access layer

DAL functions are ordinary async functions that return results, so assert on
both halves and on what the failure path chose:

```ts
it('falls back to defaults when the API is down', async () => {
  server.use(mswHttp.get('*/auth/capabilities', () => HttpResponse.error()));
  await expect(getSignInCapabilities()).resolves.toEqual(DEFAULTS);
});
```

`test/setup.node.ts` stubs the `server-only` package so these modules can be
imported at all outside a Next build. Production bundles are unaffected.

## Component tests

`renderWithProviders` from `test/test-utils.tsx` wraps the component in the
provider tree with a fresh store and a fresh `QueryClient` per test, so no
state leaks between them:

```tsx
import { renderWithProviders } from '@/../test/test-utils';

it('increments', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Counter />);

  await user.click(screen.getByRole('button', { name: /increment/i }));

  expect(screen.getByText('Current Count: 1')).toBeInTheDocument();
});
```

Query by role and accessible name. `getByRole('button', { name: /save/i })`
fails when the control stops being reachable; `getByTestId('save')` passes
happily while the button is invisible to a screen reader.

Server Components are not rendered by Testing Library. Test their data
functions as node tests, and cover the rendered output end to end.

## End-to-end tests

Playwright runs against a real production build, so it catches what unit
tests structurally cannot: prerendering, streaming, headers, redirects, and
hydration.

```ts
test('the dashboard sends visitors to sign in and back', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/auth\/login\?redirectTo=/);
});
```

Two habits keep this suite honest:

- **Assert the contract, not the copy.** URLs, roles, status codes, headers.
- **Cover what only a real build shows.** The smoke suite checks security
  headers, the request id, the manifest and icons, structured data, and that
  the https-only headers stay off over plain http, which is what a browser
  strict about mixed content would otherwise break on.

The suite runs on Chromium, Firefox, WebKit, and a mobile profile.
`pnpm test:e2e --project=webkit` runs one; CI runs Chromium and WebKit,
because they disagree about enough to matter.

## What is worth testing here

- **Every failure path in the DAL.** The happy path is usually obvious; the
  fallback, the redirect, and the rethrow are where the decisions live.
- **Schemas, against a real payload** from your API. A schema that has never
  seen production data is a guess.
- **Reducers and migrations.** A persistence migration that drops user data
  is expensive and trivially testable.
- **Anything with a boundary condition:** retries, timeouts, cancellation,
  hydration gates.

What is not worth testing: that Next renders a page, that Redux stores a
value, that a component calls a hook. Those test the framework.
