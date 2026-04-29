import { describe, expect, it } from 'vitest';

import messages from '@/i18n/translations/en.json';

import { renderWithProviders, screen, userEvent } from '../../../../test/test-utils';
import { Counter } from './Counter';

describe('Counter', () => {
  it('renders the starting count from preloadedState', () => {
    renderWithProviders(<Counter />, {
      messages,
      preloadedState: {
        count: { value: 7, _persist: { version: -1, rehydrated: true } },
      },
    });

    expect(screen.getByText(/Current Count: 7/)).toBeInTheDocument();
  });

  it('increments, decrements, and resets via button clicks', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Counter />, { messages });

    expect(screen.getByText(/Current Count: 0/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /increment/i }));
    await user.click(screen.getByRole('button', { name: /increment/i }));
    expect(screen.getByText(/Current Count: 2/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /decrement/i }));
    expect(screen.getByText(/Current Count: 1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByText(/Current Count: 0/)).toBeInTheDocument();
  });
});
