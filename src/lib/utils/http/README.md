# HTTP Client Documentation

Complete guide for making API requests in this Next.js application using our custom HTTP clients.

> **💡 Note:** During project setup, you can choose which HTTP client(s) to keep. Run `yarn setup` to configure your preferred client (Axios, Fetch, both, or remove all).

## Table of Contents

- [Quick Start](#quick-start)
- [Available Clients](#available-clients)
- [Basic Usage](#basic-usage)
- [Advanced Usage](#advanced-usage)
- [Error Handling](#error-handling)
- [Authentication](#authentication)
- [Custom Client Configuration](#custom-client-configuration)
- [API Reference](#api-reference)

---

## Quick Start

```typescript
import { fetchClient } from '@/lib/utils/http';

async function getUsers() {
  const result = await fetchClient.get('/users');

  if (result.isLeft()) {
    console.error(result.value.message);
    return;
  }

  const users = result.value;
  console.log(users);
}
```

---

## Available Clients

### 1. `fetchClient` (Recommended)

**Native Fetch API** - Zero dependencies, works everywhere

```typescript
import { fetchClient } from '@/lib/utils/http';
```

**When to use:**

- ✅ Server Components
- ✅ Client Components
- ✅ Edge Runtime
- ✅ API Routes
- ✅ Server Actions
- ✅ Middleware

**Bundle Size:** 0KB (native browser API)

### 2. `axiosClient`

**Axios-based** - For legacy code or specific Axios features

```typescript
import { axiosClient } from '@/lib/utils/http';
```

**When to use:**

- ✅ Node.js specific features
- ✅ Legacy code migration
- ✅ Advanced request/response transformations

**Bundle Size:** ~30KB

---

## Basic Usage

### GET Request

```typescript
import { fetchClient } from '@/lib/utils/http';

async function fetchUser(id: string) {
  const result = await fetchClient.get(`/users/${id}`);

  if (result.isRight()) {
    const user = result.value;
    return user;
  }

  const error = result.value;
  console.error(error.message);
  return null;
}
```

### POST Request

```typescript
async function createUser(userData: CreateUserDto) {
  const result = await fetchClient.post('/users', userData);

  if (result.isRight()) {
    console.log('User created:', result.value);
  } else {
    console.error('Failed:', result.value.message);
  }
}
```

### PUT Request

```typescript
async function updateUser(id: string, data: UpdateUserDto) {
  const result = await fetchClient.put(`/users/${id}`, data);

  return result.isRight() ? result.value : null;
}
```

### PATCH Request

```typescript
async function partialUpdate(id: string, data: Partial<User>) {
  const result = await fetchClient.patch(`/users/${id}`, data);

  return result;
}
```

### DELETE Request

```typescript
async function deleteUser(id: string) {
  const result = await fetchClient.delete(`/users/${id}`);

  if (result.isRight()) {
    console.log('User deleted successfully');
  }
}
```

---

## Advanced Usage

### Custom Headers

```typescript
const result = await fetchClient.get('/users', {
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### Query Parameters

```typescript
const params = new URLSearchParams({
  page: '1',
  limit: '10',
  sort: 'createdAt',
});

const result = await fetchClient.get(`/users?${params}`);
```

### Paginated Requests

```typescript
import { PaginatedApiResponse } from '@/types';

async function fetchUsers(page: number, pageSize: number) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  const result = await fetchClient.get<PaginatedApiResponse<User>>(`/users?${params}`);

  if (result.isRight()) {
    const { items, meta } = result.value;

    console.log('Users:', items);
    console.log('Total:', meta.totalItems);
    console.log('Current Page:', meta.currentPage);
    console.log('Total Pages:', meta.totalPages);

    return result.value;
  }

  return null;
}
```

#### React Pagination Example

```typescript
'use client';

import { fetchClient } from '@/lib/utils/http';
import { PaginatedApiResponse } from '@/types';
import { useState, useEffect } from 'react';

export function PaginatedUserList() {
  const [data, setData] = useState<PaginatedApiResponse<User> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });

      const result = await fetchClient.get<PaginatedApiResponse<User>>(
        `/users?${params}`
      );

      if (result.isRight()) {
        setData(result.value);
      }
      setLoading(false);
    }

    loadUsers();
  }, [currentPage]);

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <ul>
        {data.items.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>

      <div className="pagination">
        <button
          onClick={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <span>
          Page {data.meta.currentPage} of {data.meta.totalPages}
        </span>

        <button
          onClick={() => setCurrentPage(p => p + 1)}
          disabled={currentPage === data.meta.totalPages}
        >
          Next
        </button>

        <span>Total: {data.meta.totalItems} items</span>
      </div>
    </div>
  );
}
```

#### Server Component Pagination

```typescript
import { fetchClient } from '@/lib/utils/http';
import { PaginatedApiResponse } from '@/types';

interface UsersPageProps {
  searchParams: { page?: string };
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const page = Number(searchParams.page) || 1;
  const pageSize = 20;

  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  const result = await fetchClient.get<PaginatedApiResponse<User>>(
    `/users?${params}`
  );

  if (result.isLeft()) {
    return <div>Error loading users</div>;
  }

  const { items, meta } = result.value;

  return (
    <div>
      <h1>Users ({meta.totalItems})</h1>

      <ul>
        {items.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>

      <div>
        {meta.currentPage > 1 && (
          <a href={`/users?page=${meta.currentPage - 1}`}>Previous</a>
        )}

        <span>Page {meta.currentPage} of {meta.totalPages}</span>

        {meta.currentPage < meta.totalPages && (
          <a href={`/users?page=${meta.currentPage + 1}`}>Next</a>
        )}
      </div>
    </div>
  );
}
```

### Request Options (Fetch Client)

```typescript
const result = await fetchClient.post('/users', data, {
  cache: 'no-cache',
  next: { revalidate: 3600 },
  signal: AbortSignal.timeout(5000),
});
```

### Skip Data Extraction

By default, clients extract `data.data` from responses. To get raw response:

```typescript
const result = await fetchClient.get('/users', undefined, null);
```

### Custom Data Key

```typescript
const result = await fetchClient.get('/users', undefined, 'items');
```

---

## Error Handling

### Using Either Pattern

```typescript
const result = await fetchClient.get('/users');

if (result.isLeft()) {
  const error = result.value;
  console.error({
    status: error.status,
    message: error.message,
    errors: error.errors,
  });
  return;
}

const users = result.value;
```

### Using fold() Method

```typescript
const result = await fetchClient.get<User[]>('/users');

result.fold(
  (error) => {
    console.error('Error:', error.message);
  },
  (users) => {
    console.log('Success:', users);
  },
);
```

### Handling Validation Errors

ApiException provides utility methods for working with validation errors:

```typescript
const result = await fetchClient.post('/users', invalidData);

if (result.isLeft()) {
  const error = result.value;

  // Check if specific field has error
  if (error.containsKey('email')) {
    console.log('Email error:', error.getErrorMessage('email'));
  }

  // Get error message for field or fallback to general message
  const emailError = error.getErrorMessageIfExists('email');

  // Get all field errors as object
  const fieldErrors = error.getFieldErrors();
  // { email: 'Invalid email format', password: 'Too short' }

  Object.entries(fieldErrors).forEach(([field, message]) => {
    console.log(`${field}: ${message}`);
  });
}
```

#### Using with React Forms

```typescript
'use client';

import { fetchClient } from '@/lib/utils/http';
import { useState } from 'react';

export function UserForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(data: FormData) {
    const result = await fetchClient.post('/users', data);

    if (result.isLeft()) {
      const error = result.value;

      // Set all validation errors at once
      setErrors(error.getFieldErrors());
    } else {
      setErrors({});
      console.log('Success!');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      {errors.email && <span className="error">{errors.email}</span>}

      <input name="password" />
      {errors.password && <span className="error">{errors.password}</span>}
    </form>
  );
}
```

### Using in React Components

```typescript
'use client';

import { fetchClient } from '@/lib/utils/http';
import { useState, useEffect } from 'react';

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      const result = await fetchClient.get<User[]>('/users');

      if (result.isRight()) {
        setUsers(result.value);
      } else {
        setError(result.value.message);
      }
    }

    loadUsers();
  }, []);

  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Using in Server Components

```typescript
import { fetchClient } from '@/lib/utils/http';

export default async function UsersPage() {
  const result = await fetchClient.get<User[]>('/users');

  if (result.isLeft()) {
    return <div>Error: {result.value.message}</div>;
  }

  const users = result.value;

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

---

## Authentication

### Automatic Token Management

Both clients automatically:

- ✅ Add authentication headers
- ✅ Refresh expired tokens
- ✅ Retry failed requests with new tokens
- ✅ Redirect to login on auth failure

### Token Storage

Tokens are stored via `secureStorageTokenStore`:

- **Browser:** localStorage (encrypted)
- **Server:** Memory (request scoped)

### Manual Token Refresh

```typescript
import { fetchClient } from '@/lib/utils/http';

const result = await fetchClient.post('/auth/refresh');
```

### Skip Auth for Public Endpoints

```typescript
const result = await fetchClient.get('/public/data', {
  _skipAuthInterceptor: true,
});
```

### Cookie-based Authentication

Both clients send cookies automatically:

- `fetchClient`: via `credentials: 'include'`
- `axiosClient`: via `withCredentials: true`

---

## Custom Client Configuration

### Create Custom Fetch Client

```typescript
import { createFetchClient } from '@/lib/utils/http';
import { secureStorageTokenStore } from '@/lib/utils/http/token-store';

const customClient = createFetchClient({
  baseURL: 'https://api.example.com',
  tokenStore: secureStorageTokenStore,
  cache: 'force-cache',
  defaultOptions: {
    headers: {
      'X-API-Version': 'v2',
    },
  },
  onUnauthorized: () => {
    console.log('Auth failed');
    window.location.href = '/login';
  },
});
```

### Create Custom Axios Client

```typescript
import { createAxiosClient } from '@/lib/utils/http';
import { secureStorageTokenStore } from '@/lib/utils/http/token-store';

const customClient = createAxiosClient({
  baseURL: 'https://api.example.com',
  tokenStore: secureStorageTokenStore,
  onUnauthorized: () => {
    window.location.href = '/login';
  },
});
```

### Custom Token Store

```typescript
import { TokenStore } from '@/types';

const customTokenStore: TokenStore = {
  async getAccessToken() {
    return sessionStorage.getItem('access_token');
  },
  async saveAccessToken(token: string) {
    sessionStorage.setItem('access_token', token);
  },
  async getRefreshToken() {
    return sessionStorage.getItem('refresh_token');
  },
  async saveRefreshToken(token: string) {
    sessionStorage.setItem('refresh_token', token);
  },
  async clear() {
    sessionStorage.clear();
  },
};

const client = createFetchClient({
  tokenStore: customTokenStore,
});
```

---

## API Reference

### Client Methods

#### `get<T>(url, options?, dataKey?)`

**Parameters:**

- `url` - Request URL (relative to baseURL)
- `options` - Request configuration (optional)
- `dataKey` - Key to extract from response (default: 'data')

**Returns:** `Promise<Either<ApiException, T>>`

#### `post<T>(url, data?, options?, dataKey?)`

**Parameters:**

- `url` - Request URL
- `data` - Request body
- `options` - Request configuration (optional)
- `dataKey` - Key to extract from response (default: 'data')

**Returns:** `Promise<Either<ApiException, T>>`

#### `put<T>(url, data?, options?, dataKey?)`

Same as `post()`

#### `patch<T>(url, data?, options?, dataKey?)`

Same as `post()` (fetchClient only)

#### `delete<T>(url, options?, dataKey?)`

Same as `get()`

### Either Methods

#### `isLeft(): boolean`

Returns `true` if result contains an error.

```typescript
if (result.isLeft()) {
  const error = result.value;
}
```

#### `isRight(): boolean`

Returns `true` if result contains successful data.

```typescript
if (result.isRight()) {
  const data = result.value;
}
```

#### `fold<U>(onLeft, onRight): U`

Pattern match on the result.

```typescript
const message = result.fold(
  (error) => `Error: ${error.message}`,
  (data) => `Success: ${data.length} items`,
);
```

### ApiException Properties & Methods

```typescript
class ApiException extends Error {
  status: number;
  message: string;
  errors?: Array<Record<string, string>>;
  stack?: string;

  // Check if specific field has validation error
  containsKey(key: string): boolean;

  // Get error message for specific field
  getErrorMessage(key: string): string | undefined;

  // Get error message or fallback to general message
  getErrorMessageIfExists(key: string): string;

  // Get all field errors as flat object
  getFieldErrors(): Record<string, string>;
}
```

**Example:**

```typescript
const result = await fetchClient.post('/users', { email: 'invalid' });

if (result.isLeft()) {
  const error = result.value;

  // Properties
  console.log(error.status); // 400
  console.log(error.message); // "Validation failed"
  console.log(error.errors); // [{ email: "Invalid format" }]

  // Methods
  error.containsKey('email'); // true
  error.getErrorMessage('email'); // "Invalid format"
  error.getErrorMessageIfExists('email'); // "Invalid format"
  error.getFieldErrors(); // { email: "Invalid format" }
}
```

---

## TypeScript Support

### Type-safe Responses

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const result = await fetchClient.get<User>('/users/123');

if (result.isRight()) {
  const user: User = result.value;
  console.log(user.name);
}
```

### Type-safe Paginated Responses

```typescript
import { PaginatedApiResponse, ApiPaginationMeta } from '@/types';

interface User {
  id: string;
  name: string;
  email: string;
}

const result = await fetchClient.get<PaginatedApiResponse<User>>('/users');

if (result.isRight()) {
  const { items, meta } = result.value;

  // items is User[]
  items.forEach((user) => console.log(user.name));

  // meta is ApiPaginationMeta
  console.log(meta.totalItems, meta.totalPages);
}
```

### Available API Types

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  statusCode: number;
  path: string;
  message: string;
  data: T;
  timestamp: string;
}

// Pagination metadata
interface ApiPaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

// Paginated response
interface PaginatedApiResponse<T> {
  items: T[];
  meta: ApiPaginationMeta;
}
```

### Type-safe Requests

```typescript
interface CreateUserDto {
  name: string;
  email: string;
  password: string;
}

const userData: CreateUserDto = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret',
};

const result = await fetchClient.post<User>('/users', userData);
```

---

## Best Practices

### ✅ DO

```typescript
// Use fetchClient for new code
import { fetchClient } from '@/lib/utils/http';

// Handle both success and error cases
const result = await fetchClient.get('/data');
if (result.isRight()) {
  /* success */
} else {
  /* handle error */
}

// Use TypeScript types
const result = await fetchClient.get<User[]>('/users');

// Use descriptive variable names
const getUserResult = await fetchClient.get(`/users/${id}`);
```

### ❌ DON'T

```typescript
// Don't ignore errors
const result = await fetchClient.get('/data');
const data = result.value; // ❌ Could be an error!

// Don't use any type
const result = await fetchClient.get<any>('/users'); // ❌

// Don't mix clients unnecessarily
import { axiosClient, fetchClient } from '@/lib/utils/http'; // ❌
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.example.com
SAVE_AUTH_TOKENS=true
```

- `NEXT_PUBLIC_API_URL` - Base API URL (required)
- `SAVE_AUTH_TOKENS` - Enable token storage (default: true)

---

## Migration Guide

### From fetch to fetchClient

**Before:**

```typescript
const response = await fetch('/api/users');
const data = await response.json();
```

**After:**

```typescript
const result = await fetchClient.get('/users');
if (result.isRight()) {
  const data = result.value;
}
```

### From axios to fetchClient

**Before:**

```typescript
try {
  const response = await axios.get('/api/users');
  const data = response.data;
} catch (error) {
  console.error(error);
}
```

**After:**

```typescript
const result = await fetchClient.get('/users');
result.fold(
  (error) => console.error(error),
  (data) => console.log(data),
);
```

---

## Troubleshooting

### Issue: "Max refresh attempts reached"

**Cause:** Token refresh endpoint is failing repeatedly.

**Solution:** Check refresh token endpoint and credentials.

### Issue: Redirected to login unexpectedly

**Cause:** Token refresh failed and `onUnauthorized` was called.

**Solution:** Verify refresh token is valid and endpoint is accessible.

### Issue: CORS errors

**Cause:** API server not configured for CORS.

**Solution:** Ensure API allows credentials and proper origins.

### Issue: Types not matching

**Cause:** Response structure doesn't match TypeScript interface.

**Solution:** Verify API response structure or adjust `dataKey` parameter.

---

## Examples

See the `/examples` directory for more usage examples:

- Authentication flow
- File uploads
- Pagination
- Real-time updates
- Error recovery

---

## Support

For issues or questions:

1. Check this documentation
2. Review type definitions in `@/types/common/http.types.ts`
3. Contact the development team

---

**Last Updated:** November 2025
