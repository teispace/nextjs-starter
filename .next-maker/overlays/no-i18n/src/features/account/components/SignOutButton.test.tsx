import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders, screen, userEvent, waitFor } from '../../../../test/test-utils';
import { SignOutButton } from './SignOutButton';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

const signOut = vi.fn();
vi.mock('../api/actions', () => ({ signOut: (...args: unknown[]) => signOut(...args) }));

describe('SignOutButton', () => {
  beforeEach(() => {
    replace.mockReset();
    signOut.mockReset();
  });

  it('runs the action and navigates home on success', async () => {
    signOut.mockResolvedValue({ data: { signedOut: true } });
    const user = userEvent.setup();
    renderWithProviders(<SignOutButton />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });

  it('shows the server error and stays put on failure', async () => {
    signOut.mockResolvedValue({
      serverError: { kind: 'HttpError', code: 'ERR_HTTP', message: 'API unavailable', status: 503 },
    });
    const user = userEvent.setup();
    renderWithProviders(<SignOutButton />);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    expect(replace).not.toHaveBeenCalled();
  });
});
