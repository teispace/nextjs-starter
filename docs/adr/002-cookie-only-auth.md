# 002. Cookie-only authentication

**Status**: accepted (v2)

**Decision**: the session lives in HttpOnly cookies set by the API in every environment. The browser refreshes once on 401 through the same-origin `POST /api/auth/refresh` Route Handler, which forwards the cookies to the API and relays `Set-Cookie`. The server never refreshes. Sign-in and sign-out are Server Actions that call the API and replay its cookies with `relaySetCookies`.

**Alternatives**: bearer tokens in web storage (1.x optional mode); refresh during Server Component render.

**Why**: tokens in JavaScript-readable storage are exfiltrated by any XSS; HttpOnly cookies are not. Refreshing during a render cannot write the rotated cookie back to the browser, and a process-wide refresh latch on the server can leak one user's session into another's request. The Route Handler is the one place on the server that both receives the browser's cookies and can set new ones. The cookie topology assumes the app and the API share a registrable domain; a cross-site split needs `SameSite=None`, credentialed CORS, and CSRF protection on the API.
