import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UpgradePage from './UpgradePage';
import { MemoryRouter } from 'react-router-dom';
import * as authSession from '@/lib/authSession';
import * as apiClient from '@/services/apiClient';
import * as paymentService from '@/services/paymentService';

// Mock lucide-react
vi.mock('lucide-react', () => {
  const Icon = ({ className, "data-testid": testId }: any) => <div className={className} data-testid={testId} />;
  return {
    CheckCircle2: (props: any) => <Icon {...props} data-testid="check-icon" />,
    Crown: (props: any) => <Icon {...props} data-testid="crown-icon" />,
    Zap: (props: any) => <Icon {...props} data-testid="zap-icon" />,
    ShieldCheck: (props: any) => <Icon {...props} data-testid="shield-icon" />,
    CreditCard: (props: any) => <Icon {...props} data-testid="card-icon" />,
    ArrowRight: (props: any) => <Icon {...props} data-testid="arrow-icon" />,
    Star: (props: any) => <Icon {...props} data-testid="star-icon" />,
    Loader2: (props: any) => <Icon {...props} data-testid="loader-icon" />,
    X: (props: any) => <Icon {...props} data-testid="x-icon" />,
    Lock: (props: any) => <Icon {...props} data-testid="lock-icon" />,
    CheckCheck: (props: any) => <Icon {...props} data-testid="checkcheck-icon" />,
  };
});

// Mock services
vi.mock('@/lib/authSession', () => ({
  getUser: vi.fn(),
}));

vi.mock('@/services/apiClient', () => ({
  apiGet: vi.fn(),
}));

vi.mock('@/services/paymentService', () => ({
  subscribePlan: vi.fn(),
  createCheckoutSession: vi.fn(),
}));

describe('UpgradePage', () => {
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    vi.clearAllMocks();
    (authSession.getUser as any).mockReturnValue(mockUser);
    (apiClient.apiGet as any).mockResolvedValue({ plan: 'FREE' });
    (paymentService.createCheckoutSession as any).mockResolvedValue({ url: null }); // Force mock modal
  });

  const renderPage = async () => {
    return await act(async () => render(
      <MemoryRouter>
        <UpgradePage />
      </MemoryRouter>
    ));
  };

  it('renders correctly and shows current plan', async () => {
    await renderPage();
    expect(screen.getByText(/Plans & Tarification/i)).toBeDefined();
    await waitFor(() => {
        expect(screen.getByText(/FREE/)).toBeDefined();
    });
  });

  it('opens checkout modal when clicking upgrade button', async () => {
    await renderPage();
    
    const upgradeBtns = screen.getAllByText(/Passer à/i);
    await act(async () => {
        fireEvent.click(upgradeBtns[0]); // PRO
    });

    expect(screen.getByText(/Plan Pro/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Dina Ben Ali/i)).toBeDefined();
  });

  it('handles card input formatting', async () => {
    await renderPage();
    const proBtn = screen.getAllByText(/Passer à/i)[0];
    await act(async () => fireEvent.click(proBtn));

    const cardInput = screen.getByPlaceholderText(/1234 5678 9012 3456/i) as HTMLInputElement;
    fireEvent.change(cardInput, { target: { value: '1111222233334444' } });
    expect(cardInput.value).toBe('1111 2222 3333 4444');
  });

  it('submits payment successfully', async () => {
    (paymentService.subscribePlan as any).mockResolvedValue({
      subscription: { plan: 'PRO' }
    });

    await renderPage();
    const proBtn = screen.getAllByText(/Passer à/i)[0];
    await act(async () => fireEvent.click(proBtn));

    fireEvent.change(screen.getByPlaceholderText(/Dina Ben Ali/i), { target: { value: 'Dina Test' } });
    fireEvent.change(screen.getByPlaceholderText(/1234 5678 9012 3456/i), { target: { value: '1234123412341234' } });
    fireEvent.change(screen.getByPlaceholderText(/MM\/AA/i), { target: { value: '12/25' } });
    fireEvent.change(screen.getByPlaceholderText(/•••/i), { target: { value: '123' } });

    const submitBtn = screen.getByText(/Payer/i);
    await act(async () => {
        fireEvent.click(submitBtn);
    });

    await waitFor(() => {
        expect(screen.getByText(/Vous êtes sur PRO !/i)).toBeDefined();
    });
  });

  it('shows error if payment fails', async () => {
    (paymentService.subscribePlan as any).mockRejectedValue(new Error('Card declined'));

    await renderPage();
    const proBtn = screen.getAllByText(/Passer à/i)[0];
    await act(async () => fireEvent.click(proBtn));

    fireEvent.change(screen.getByPlaceholderText(/Dina Ben Ali/i), { target: { value: 'Dina Test' } });
    fireEvent.change(screen.getByPlaceholderText(/1234 5678 9012 3456/i), { target: { value: '1234123412341234' } });
    fireEvent.change(screen.getByPlaceholderText(/MM\/AA/i), { target: { value: '12/25' } });
    fireEvent.change(screen.getByPlaceholderText(/•••/i), { target: { value: '123' } });

    await act(async () => {
        fireEvent.click(screen.getByText(/Payer/i));
    });

    await waitFor(() => {
        expect(screen.getByText(/Card declined/i)).toBeDefined();
    });
  });
});
