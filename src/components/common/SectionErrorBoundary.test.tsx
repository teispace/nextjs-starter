import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { SectionErrorBoundary } from './SectionErrorBoundary';

const Boom = () => {
  throw new Error('secret detail');
};

describe('SectionErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <SectionErrorBoundary title="Failed" retryLabel="Retry">
        <p>fine</p>
      </SectionErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('shows the fallback without the raw message and offers a retry', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <SectionErrorBoundary title="Failed" retryLabel="Retry">
        <Boom />
      </SectionErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    expect(screen.queryByText(/secret detail/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    spy.mockRestore();
  });
});
