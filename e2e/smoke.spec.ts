import { expect, test } from '@playwright/test';

test.describe('smoke', () => {
  test('home renders localized content with metadata and the counter works', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Nextjs Starter/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /\/opengraph-image$/,
    );

    await expect(page.getByText('Current Count: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Increment' }).click();
    await expect(page.getByText('Current Count: 1')).toBeVisible();

    // Persisted state survives a reload.
    await page.reload();
    await expect(page.getByText('Current Count: 1')).toBeVisible();
  });

  test('security headers are present', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers()['x-powered-by']).toBeUndefined();
  });

  test('the default Open Graph image is served', async ({ request }) => {
    const res = await request.get('/opengraph-image');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  });

  test('the sign-in placeholder echoes only safe return paths', async ({ page }) => {
    await page.goto('/auth/login?redirectTo=%2Fdashboard');
    await expect(page.getByText('sent back to /dashboard')).toBeVisible();
    await page.goto('/auth/login?redirectTo=https%3A%2F%2Fevil.example');
    await expect(page.getByText(/sent back to/)).toHaveCount(0);
  });

  test('unknown routes render the localized 404', async ({ page }) => {
    const res = await page.goto('/definitely-not-a-route');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  });
});
