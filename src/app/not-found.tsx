import Link from 'next/link';

// Provider-free global 404 fallback for paths outside [locale]: it renders its
// own <html>/<body> with inline styles and uses next/link (not @/i18n/navigation)
// because it runs without the locale layout's i18n/theme providers. The in-app
// localized 404 lives in src/app/[locale]/not-found.tsx.
export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
          margin: 0,
        }}
      >
        <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>404</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Page not found
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            padding: '0.5rem 1.5rem',
            borderRadius: '0.375rem',
            backgroundColor: '#202938',
            color: '#f5f5f5',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Go home
        </Link>
      </body>
    </html>
  );
}
