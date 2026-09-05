import { describe, expect, it, vi } from 'vitest';

import { ok } from '@/types';

import { makeTestQueryClient, renderWithProviders, screen } from '../../../../test/test-utils';
import { accountKeys } from '../api/keys';
import { SignInOptions } from './SignInOptions';

const get = vi.fn();
vi.mock('@/lib/http', () => ({ http: { get: (...args: unknown[]) => get(...args) } }));

describe('SignInOptions', () => {
  it('renders synchronously from hydrated query data', () => {
    const queryClient = makeTestQueryClient();
    queryClient.setQueryData(accountKeys.signInCapabilities(), {
      providers: ['password', 'github'],
      allowSignUp: false,
    });
    renderWithProviders(<SignInOptions />, { queryClient });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.queryByText(/New accounts/)).not.toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('fetches when nothing is hydrated', async () => {
    get.mockResolvedValue(ok({ providers: ['magic-link'], allowSignUp: true }));
    renderWithProviders(<SignInOptions />);

    expect(await screen.findByText('Magic link')).toBeInTheDocument();
    expect(screen.getByText(/New accounts/)).toBeInTheDocument();
  });
});
