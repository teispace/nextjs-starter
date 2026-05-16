# Feature-Based Architecture

This project follows a **Domain-Driven Design (DDD)** inspired feature-based architecture. Group code by feature, not by technical type — so everything an "auth" or "users" feature needs lives together and ships together.

## 📂 Structure

Each feature is a self-contained module under `src/features/`. The shipped reference is `src/features/counter/` — copy its layout when you add a new feature.

```
src/features/
└── counter/                  # Feature name (kebab-case folder)
    ├── components/           # UI components specific to this feature
    │   ├── Counter.tsx
    │   └── Counter.test.tsx  # Co-located test
    ├── hooks/                # React hooks specific to this feature
    │   └── useCounter.ts
    ├── store/                # Redux slice/selectors/persist (optional)
    │   ├── counter.slice.ts
    │   ├── counter.selectors.ts
    │   ├── persist.ts        # Per-feature redux-persist config
    │   └── index.ts          # Barrel re-export for `@/store/rootReducer`
    ├── types/                # Feature-local TypeScript types
    │   └── counter.types.ts
    └── index.ts              # Public API — only what's safe to import from outside
```

Optional subfolders you can add when the feature needs them: `services/` (API/SDK wrappers), `providers/` (feature-scoped React providers), `hoc/`. **Skip the folder if it has no files** — empty placeholders rot fast.

## 🚀 Creating a New Feature

1.  **Create the folder** under `src/features/` (e.g., `products`).
2.  **Components** go in `src/features/products/components/`. Co-locate tests as `*.test.tsx`.
3.  **Hooks** go in `src/features/products/hooks/`.
4.  **Types** go in `src/features/products/types/<name>.types.ts`.
5.  **Redux** (if the feature owns state) goes in `src/features/products/store/`. Wire the reducer into `src/store/rootReducer.ts`. Persist via the feature's own `persist.ts` so persistence config travels with the feature.
6.  **Public API** — re-export from `src/features/products/index.ts`. Only export what other features / the `app/` layer needs.

    ```ts
    // src/features/products/index.ts
    export * from './components/product-list';
    export * from './hooks/use-products';
    export * from './types/products.types';
    ```

## 🤝 Rules of Engagement

1.  **Encapsulation**:
    Features should be as independent as possible. Avoid deep coupling between features.

2.  **Public API**:
    Only import from the `index.ts` of a feature. Do not import directly from internal files (e.g., `import ... from '@/features/auth/components/login-form'` is bad; `import ... from '@/features/auth'` is good).

3.  **Shared Code**:
    If code is shared between multiple features, move it to `src/components/common`, `src/hooks`, or `src/lib`.

4.  **App Layer**:
    The `src/app` directory (Next.js App Router) should primarily compose features together. It should contain minimal business logic.

## 📝 Sketch: an auth feature

**`src/features/auth/types/auth.types.ts`**

```ts
export interface User {
  id: string;
  email: string;
}
```

**`src/features/auth/hooks/useAuth.ts`**

```ts
import { useState } from 'react';
import type { User } from '../types/auth.types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // ... logic
  return { user };
}
```

**`src/features/auth/components/LoginForm.tsx`**

```tsx
import { useAuth } from '../hooks/useAuth';

export function LoginForm() {
  const { user } = useAuth();
  return <form>{/* ... */}</form>;
}
```

**`src/features/auth/index.ts`**

```ts
export * from './components/LoginForm';
export * from './hooks/useAuth';
export type { User } from './types/auth.types';
```

**Usage in `src/app/[locale]/login/page.tsx`**

```tsx
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return <LoginForm />;
}
```

For a working example with state + persistence, see `src/features/counter/`.
