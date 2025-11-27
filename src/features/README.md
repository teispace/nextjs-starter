# Feature-Based Architecture

This project follows a **Domain-Driven Design (DDD)** inspired feature-based architecture. This structure helps in scaling the application by keeping related code together, making it easier to maintain and test.

## 📂 Structure

Each feature is a self-contained module located in `src/features/`.

```
src/features/
├── auth/                   # Feature name (e.g., auth, users, projects)
│   ├── components/         # UI components specific to this feature
│   │   ├── login-form.tsx
│   │   └── register-form.tsx
│   ├── hooks/              # React hooks specific to this feature
│   │   └── use-auth.ts
│   ├── services/           # API services specific to this feature (optional)
│   │   └── auth.service.ts
│   ├── store/              # Redux slices specific to this feature (optional)
│   │   └── auth.slice.ts
│   ├── types.ts            # TypeScript types/interfaces for this feature
│   └── index.ts            # Public API (exports) of the feature
└── ...
```

## 🚀 Creating a New Feature

1.  **Create the folder structure**:
    Create a new folder in `src/features/` with the name of your feature (e.g., `products`).

2.  **Add Components**:
    Place your feature-specific components in `src/features/products/components/`.

3.  **Add Hooks**:
    Place your feature-specific hooks in `src/features/products/hooks/`.

4.  **Define Types**:
    Define your interfaces and types in `src/features/products/types.ts`.

5.  **Export Public API**:
    Use `src/features/products/index.ts` to export only what should be accessible from outside the feature.

    ```typescript
    // src/features/products/index.ts
    export * from './components/product-list';
    export * from './hooks/use-products';
    export * from './types';
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

## 📝 Example: Auth Feature

**`src/features/auth/types.ts`**

```typescript
export interface User {
  id: string;
  email: string;
}
```

**`src/features/auth/hooks/use-auth.ts`**

```typescript
import { useState } from 'react';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // ... logic
  return { user };
}
```

**`src/features/auth/components/login-form.tsx`**

```typescript
import { useAuth } from '../hooks/use-auth';

export function LoginForm() {
  const { login } = useAuth();
  return <form>...</form>;
}
```

**`src/features/auth/index.ts`**

```typescript
export * from './components/login-form';
export * from './hooks/use-auth';
export * from './types';
```

**Usage in `src/app/[locale]/login/page.tsx`**

```typescript
import { LoginForm } from '@/features/auth';

export default function LoginPage() {
  return <LoginForm />;
}
```
