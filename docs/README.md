# Documentation

This template is opinionated: for most questions there is one intended
answer, and these guides say what it is and why. Read them in this order the
first time.

| Guide | What it answers |
| :-- | :-- |
| [Getting started](getting-started.md) | Run it, read the demo feature, make your first change. |
| [Data layer](data-layer.md) | Where reads and writes live, what is cached, how the session is checked. |
| [Results and errors](results-and-errors.md) | Why nothing throws at the transport, and what to do with a failure. |
| [HTTP clients](../src/lib/http/README.md) | One client, three entry points, adapters, retries, schemas, the BFF proxy. |
| [Client state](state.md) | What belongs in the store, persistence with migrations, and what does not belong there. |
| [Auth and sessions](auth.md) | Cookie-only sessions, guards, the single browser refresh, cookie relay. |
| [Testing](testing.md) | Unit, component, and end-to-end patterns, and what each one is for. |
| [SEO](seo.md) | Metadata, canonical and hreflang, JSON-LD, sitemap, social images. |
| [Security](security.md) | Response headers, the three CSP modes, nonces, cookie policy. |
| [Observability](observability.md) | Structured logs, request ids, and where a failed request surfaces. |
| [Deployment](deployment.md) | Environment variables, standalone builds, Docker, and a release checklist. |
| [Recipes](recipes.md) | Worked end-to-end tasks: CRUD, pagination, optimistic updates, uploads, realtime. |
| [UI libraries](ui-libraries.md) | Why no component primitives ship here, and how to add the library you want. |
| [i18n](../src/i18n/README.md) | Locales, routing, typed messages, formats. | <!-- @next-maker:i18n -->
| [Realtime](../src/lib/ws/README.md) | The Socket.IO client, hooks, and the store bridge. | <!-- @next-maker:ws -->
| [Features](../src/features/README.md) | The anatomy of a feature module. |

<!-- @next-maker:starterDocs:start -->
Three more live in the starter repository and are removed from generated
projects: [structure.md](structure.md), a file-by-file map;
[composition.md](composition.md), how the CLI turns this tree into a project;
and the [decision records](adr/), which explain the choices that are
expensive to reverse.
<!-- @next-maker:starterDocs:end -->

## The shape of the thing

```
Browser ──► Server Component ──► DAL (server.ts) ──► serverHttp ──► your API
                │                                     publicServerHttp
                │
                ├──► Server Action (actions.ts) ──► serverHttp ──► your API
                │
                └──► Client Component ──► TanStack Query ──► http ──► your API
                                       └─► store (client-only state)
```

Four rules follow from that picture, and most of the guides are elaborations
of them:

1. **The server reads through the data access layer**, never with a bare
   `fetch` in a component.
2. **The client writes through Server Actions**, never with a `fetch` to your
   API.
3. **Nothing throws at the transport.** Calls resolve to a result you narrow.
4. **Server data does not live in the client store.**
