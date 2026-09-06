# Recipes

Worked examples for the tasks that come up in a real application. Each one
uses the layers described in [data layer](data-layer.md); read that first if
a step looks arbitrary.

## A CRUD feature, end to end

The complete path for a resource the user lists, opens, and edits.

```bash
pnpm exec next-maker feature invoice --api --store --persist
```

**1. Contracts first.** Everything else is inferred from these.

```ts
// src/features/invoice/api/schema.ts
export const invoiceSchema = z.object({
  id: z.string(),
  reference: z.string(),
  amountCents: z.number().int(),
  status: z.enum(['draft', 'sent', 'paid']),
  issuedAt: z.iso.datetime(),
});
export const invoiceListSchema = z.object({ invoices: z.array(invoiceSchema) });

export type Invoice = z.infer<typeof invoiceSchema>;

export const createInvoiceSchema = invoiceSchema.pick({ reference: true, amountCents: true });
```

**2. Endpoints** in `src/lib/config/app-apis.ts`, relative to the API base:

```ts
invoice: {
  list: '/invoices',
  byId: (id: string) => `/invoices/${id}`,
  create: '/invoices',
},
```

**3. Read on the server.** Invoices belong to the signed-in user, so no
cache, and the caller sits under `<Suspense>`.

```ts
// src/features/invoice/api/server.ts
import 'server-only';

export async function listInvoices(): Promise<Invoice[]> {
  const result = await serverHttp.get(AppApis.invoice.list, { schema: invoiceListSchema });
  if (!result.ok) {
    if (result.error.isUnauthorized()) return [];
    throw result.error;
  }
  return result.data.invoices;
}

export async function getInvoice(id: string): Promise<Invoice> {
  const result = await serverHttp.get(AppApis.invoice.byId(id), { schema: invoiceSchema });
  if (!result.ok) {
    if (result.error.isNotFound()) notFound();
    throw result.error;
  }
  return result.data;
}
```

**4. Write with an action.** Validate the input, revalidate what changed.

```ts
// src/features/invoice/api/actions.ts
'use server';

export const createInvoice = authActionClient
  .metadata({ name: 'invoice.create' })
  .inputSchema(createInvoiceSchema)
  .action(async ({ parsedInput }) => {
    const result = await serverHttp.post(AppApis.invoice.create, parsedInput, {
      schema: invoiceSchema,
    });
    if (!result.ok) {
      // Your own codes are plain strings; ACTION_ERROR_CODE ships the three
      // the clients raise themselves.
      if (result.error.isClientFailure()) {
        returnServerError(actionError(INVOICE_ERROR.DUPLICATE_REFERENCE, 'That reference is taken.', 409));
      }
      throw result.error;
    }
    revalidateTag(INVOICE_TAG, 'max');
    return result.data;
  });
```

**5. Render it.**

```tsx
// src/app/[locale]/(app)/invoices/page.tsx
export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoiceListSkeleton />}>
      <InvoiceList />
    </Suspense>
  );
}

async function InvoiceList() {
  const invoices = await listInvoices();
  if (invoices.length === 0) return <EmptyState />;
  return <ul>{invoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)}</ul>;
}
```

**6. Submit from the client.**

```tsx
'use client';
const { execute, isPending, result } = useAction(createInvoice);

<form action={() => execute({ reference, amountCents })}>
  <button type="submit" disabled={isPending}>{t('create')}</button>
  {result.serverError ? <p role="alert">{result.serverError.message}</p> : null}
</form>
```

## A list the client paginates

When the client drives the data, add a query and let the server prefetch the
first page so nothing flashes.

```ts
// api/keys.ts
export const invoiceKeys = {
  all: ['invoice'] as const,
  list: (page: number) => [...invoiceKeys.all, 'list', page] as const,
};

// api/queries.ts
export const invoiceListQuery = (page: number) =>
  queryOptions({
    queryKey: invoiceKeys.list(page),
    queryFn: ({ signal }) =>
      http
        .get(AppApis.invoice.list, { params: { page }, schema: invoiceListSchema, signal })
        .then(unwrapForQuery),
    staleTime: 30_000,
  });

export const useInvoiceList = (page: number) => useSuspenseQuery(invoiceListQuery(page));
```

```tsx
async function InvoicesSection() {
  await prefetchQuery({ queryKey: invoiceKeys.list(1), queryFn: () => listInvoices() });
  return (
    <HydrateQueries>
      <InvoiceTable />
    </HydrateQueries>
  );
}
```

Drop the `await` to stream instead of blocking. A failed prefetch is not
dehydrated, so the client fetches again and owns the error state; the page
never breaks because a background prefetch failed.

## An optimistic update

```tsx
'use client';
const queryClient = useQueryClient();

const { execute } = useAction(archiveInvoice, {
  onExecute: ({ input }) => {
    queryClient.setQueryData(invoiceKeys.list(1), (old: InvoiceList | undefined) =>
      old && { ...old, invoices: old.invoices.filter((i) => i.id !== input.id) },
    );
  },
  onError: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
});
```

Invalidate on both endings. On failure it restores the truth; on success it
picks up whatever else the server changed.

## A protected page

```tsx
export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const user = await requireUser(`${AppPaths.dashboard}/settings`);
  return <SettingsForm user={user} />;
}
```

In the page, not the layout, and the API still enforces the real rule. See
[auth](auth.md).

## A file upload

The client sends a `FormData` body; the transport passes it through
untouched, so do not set a content type by hand.

```ts
export const uploadAttachment = authActionClient
  .metadata({ name: 'invoice.uploadAttachment' })
  .inputSchema(z.object({ id: z.string(), file: z.instanceof(File) }))
  .action(async ({ parsedInput }) => {
    const body = new FormData();
    body.set('file', parsedInput.file);

    const result = await serverHttp.post(AppApis.invoice.attachments(parsedInput.id), body, {
      timeout: 60_000,          // uploads outlive the 10s default
    });
    if (!result.ok) throw result.error;
    revalidateTag(`invoice:${parsedInput.id}`, 'max');
    return { uploaded: true };
  });
```

For large files, prefer a signed URL from your API and upload directly to
storage: a Server Action is not a good pipe for hundreds of megabytes.

## Live updates over the socket

Declare the event on `ServerToClientEvents` in `src/lib/ws/types/events.ts`
first; the hook is typed from it, so the handler's payload needs no
annotation and a typo in the event name is a compile error.

```tsx
'use client';
const { isConnected } = useWsStatus();
const queryClient = useQueryClient();

useWsEvent('invoice.updated', () => {
  queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
});
```

Let the socket say *what changed* and let the query layer refetch it. Pushing
server records into the store gives you two caches to keep in step.
`useWsStatus()` returns the connection state (`status`, `isConnected`,
`socketId`, `lastError`) for a presence indicator.
<!-- @next-maker:ws --> The [realtime guide](../src/lib/ws/README.md) covers the client itself.

## A new locale

```bash
pnpm exec next-maker locale es --name Spanish --country Spain --flag ES --no-copy-translations
```

That adds the translation file, registers the locale, and updates the
supported list. Messages are typed from the English file, so a missing key is
a compile error rather than a blank string at runtime. With more than one
locale in the URL, hreflang alternates start appearing on their own.

## A shared component

```bash
pnpm exec next-maker component EmptyState --i18n
```

It lands in `src/components/common/EmptyState/` with a test and a translation
namespace. Keep a component in `src/components` only when more than one
feature uses it; otherwise it belongs to the feature.

## Switching an option later

```bash
npx @teispace/next-maker setup --set state=zustand --dry-run
npx @teispace/next-maker setup --set state=zustand
```

The dry run prints every file it would replace, delete, or merge. After a
switch, code of your own that used the old library is listed by name, and
`next-maker doctor --compile` finds anything else that no longer builds.
