# Auth and sessions

Sessions are HttpOnly cookies issued by your API. This application never sees
a token, never stores one, and never puts one in a header it composes itself.
That removes the whole class of bugs where a token reaches `localStorage`, a
log line, or an error report.

## The model in one table

| Question | Answer |
| :-- | :-- |
| Where does the session live? | An HttpOnly cookie set by your API. |
| How does the server know who is asking? | It forwards the sanitised cookie header upstream and asks. |
| How does the browser know? | It does not. It asks the server, which asks the API. |
| Who refreshes an expired session? | The browser, once, through a same-origin route. Never the server. |
| What happens on a 401 during render? | It becomes a value. Render the signed-out state or redirect. |

## Reading the session on the server

```ts
import { getCurrentUser, requireUser } from '@/lib/auth';

const user = await getCurrentUser();   // AuthUser | null
const user = await requireUser('/dashboard/settings');  // redirects when signed out
```

`getCurrentUser` is wrapped in React `cache`, so a render that needs the user
in several places makes one upstream call. It is deliberately not a
`'use cache'` function: a session is per visitor and must never be served
from a shared cache.

Reading the session reads cookies, which makes the caller dynamic, so the
component that calls it sits under `<Suspense>`:

```tsx
export default function DashboardPage() {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountPanel />
    </Suspense>
  );
}

async function AccountPanel() {
  const user = await requireUser(AppPaths.dashboard);
  return <p>{user.email}</p>;
}
```

**Check the session in the page, not the layout.** Layouts do not re-run on
client navigation, so a layout-only guard protects the first load and nothing
after it. A guard is also not a security boundary on its own: the API must
still reject the request. It exists so people see the right screen.

## Protecting a Server Action

An action is a public endpoint. Anyone who can reach your site can call it,
so the check belongs inside it:

```ts
export const updateProfile = authActionClient
  .metadata({ name: 'account.updateProfile' })
  .inputSchema(profileSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx.user is present, or this never ran
  });
```

`authActionClient` loads the session first and returns a 401 `ActionError` to
anonymous callers, so `ctx.user` is always there. Use `actionClient` only for
genuinely public actions.

## The refresh flow

Exactly one component refreshes, and it is the browser client:

```
Client component
  └─ http.get(...)                 401
       └─ POST /api/auth/refresh   same origin, forwards cookies
            └─ API refresh         Set-Cookie: session=…
       └─ replay original request  once
            └─ still 401 → redirect to sign in
```

`src/app/api/auth/refresh/route.ts` exists because the browser cannot call
your API's refresh endpoint in a way that lets this application control
cookies. It forwards the incoming cookies, then relays every `Set-Cookie` the
API answers with.

The server never refreshes. During a render there is nowhere to put a new
cookie, and a render is not the place for a side effect that changes the
visitor's session. A 401 on the server is simply a signed-out result.

## Relaying cookies from an action

On a server-to-server call, the API's `Set-Cookie` headers stop at your
server. When an action should change the visitor's session, replay them:

```ts
const result = await serverHttp.post<void>(AppApis.auth.logout, undefined, {
  onResponse: (response) => void relaySetCookies(response),
});
```

`relaySetCookies` parses the headers and writes them through Next's cookie
store, which is writable only in Server Actions and Route Handlers. Sign-in,
sign-out, and anything else that rotates the session needs it.

## Authorization

Being signed in and being allowed are different questions.
`AuthUser` carries optional `roles` and `permissions`, and the helpers in
`@/lib/auth` read them:

| Helper | Use |
| :-- | :-- |
| `hasRole(user, ...roles)` | Hide a control the user cannot use. |
| `hasPermission(user, ...permissions)` | The same, per permission. |
| `hasEveryPermission(user, ...permissions)` | When all of them are required. |
| `requireRole(roles, returnTo?)` | Guard a page. Signed out redirects to sign in; signed in without the role renders `forbidden.tsx`. |
| `requirePermission(permissions, returnTo?)` | The same, per permission. |

```tsx
async function AdminPanel() {
  const user = await requireRole(['admin'], AppPaths.dashboard);
  return <Panel user={user} />;
}
```

Actions declare their claims in metadata, so the rule sits with the action's
name and the call is refused before the body runs:

```ts
export const deleteInvoice = authActionClient
  .metadata({ name: 'invoice.delete', permissions: ['invoice.delete'] })
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => { /* ctx.user holds the claim */ });
```

Call a guard under `<Suspense>`, like any other read of request data. The
response has already started streaming when it runs, so the 403 page renders
with a 200 status; see the note in [security](security.md#the-status-code-of-a-refused-page)
for when that matters and what to do about it.

Every check fails closed: an API that models no claims grants none, and an
empty list grants nothing. And none of it is the enforcement point. The API
owns authorization and must reject what it should not serve; these checks
exist so people see the right screen instead of a wall of failed requests.

## Same-origin mode

With the `bff` option on, browser calls go to `/api/backend/...` on this
origin, and a pass-through route forwards them to your API with the session
cookies. That is the answer when the API sits on another registrable domain
and third-party cookie rules would otherwise drop the session. Keep the route
a pass-through: business logic there is logic that no longer runs in your
API, where the authorization is.

## Cookie requirements

For the session to survive, your API's cookies must satisfy:

- `HttpOnly`, so scripts cannot read them.
- `Secure` in production, and `SameSite=Lax` at minimum.
- A domain that covers both origins, or same-origin mode above.

In development, an API on a different host will not receive cookies at all.
Run it behind the same host, or set the backend's cookie domain. Being
redirected to sign-in forever locally is almost always this.

## Testing auth paths

Session lookups go through the HTTP client, so tests intercept at that
boundary with MSW rather than mocking the auth helpers:

```ts
server.use(
  http.get('*/auth/me', () => HttpResponse.json({ data: { id: '1', email: 'a@b.c' } })),
);
```

The end-to-end suite covers the visible contract: a signed-out visitor
reaching a protected page lands on sign-in and comes back afterwards.
