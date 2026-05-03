import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIChatOverlay } from './AIChatOverlay';
import { MemoryRouter } from 'react-router-dom';

describe('AIChatOverlay Component', () => {
  const mockChat = {
    sessionId: 'session-123',
    isInitializing: false,
    contextHints: ['Hint 1'],
    messages: [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there' }
    ],
    history: [
      { id: 'hist-1', title: 'Old Chat', createdAt: new Date().toISOString() }
    ],
    input: '',
    isLoading: false,
    error: null,
    setInput: vi.fn(),
    ensureSession: vi.fn(),
    sendMessage: vi.fn(),
    loadSession: vi.fn(),
    startNewSession: vi.fn(),
    deleteSession: vi.fn(),
    renameSession: vi.fn(),
    usage: {
      plan: 'FREE',
      chat: { used: 5, limit: 20 }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.confirm = vi.fn().mockReturnValue(true);
  });

  const renderComponent = (props = {}) => {
    return render(
      <MemoryRouter>
        <AIChatOverlay isOpen={true} onClose={vi.fn()} chat={mockChat as any} {...props} />
      </MemoryRouter>
    );
  };

  it('renders correctly when open', () => {
    renderComponent();
    expect(screen.getByText('AI Skin Coach')).toBeDefined();
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there')).toBeDefined();
    expect(screen.getByText('Hint 1')).toBeDefined();
  });

  it('calls ensureSession when opened', () => {
    renderComponent();
    expect(mockChat.ensureSession).toHaveBeenCalled();
  });

  it('handles message input and sending', () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText(/Dites-moi tout sur votre peau/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    
    expect(mockChat.setInput).toHaveBeenCalledWith('Test message');

    const form = input.closest('form');
    fireEvent.submit(form!);
    
    expect(mockChat.sendMessage).toHaveBeenCalled();
  });

  it('handles suggested questions click', () => {
    renderComponent();
    
    const suggestedBtn = screen.getByText('Quel est mon âge de peau actuel ?');
    fireEvent.click(suggestedBtn);
    
    expect(mockChat.sendMessage).toHaveBeenCalledWith('Quel est mon âge de peau actuel ?');
  });

  it('displays error states correctly', () => {
    const errorChat = { ...mockChat, error: 'Network error' };
    renderComponent({ chat: errorChat });
    expect(screen.getByText('Network error')).toBeDefined();
  });

  it('displays limit reached state', () => {
    const limitChat = { ...mockChat, error: 'LIMIT_REACHED' };
    renderComponent({ chat: limitChat });
    expect(screen.getByText(/Vous avez atteint votre quota de/i)).toBeDefined();
  });

  it('shows loading state', () => {
    const loadingChat = { ...mockChat, isLoading: true };
    renderComponent({ chat: loadingChat });
    expect(screen.getByText('DeepSkyn réfléchit...')).toBeDefined();
  });

  it('toggles history sidebar', async () => {
    renderComponent();
    const historyBtn = screen.getByLabelText('Toggle history');
    fireEvent.click(historyBtn);
    
    // Sidebar should be visible, let's verify history item is rendered
    expect(screen.getByText('Old Chat')).toBeDefined();
  });

  it('handles history item click', () => {
    renderComponent();
    
    const historyItem = screen.getByText('Old Chat');
    fireEvent.click(historyItem);
    
    expect(mockChat.loadSession).toHaveBeenCalledWith('hist-1');
  });

  it('handles start new session click', () => {
    renderComponent();
    const historyBtn = screen.getByLabelText('Toggle history');
    fireEvent.click(historyBtn);

    const newBtn = screen.getByText('Nouvelle discussion');
    fireEvent.click(newBtn);
    
    expect(mockChat.startNewSession).toHaveBeenCalled();
  });

  it('handles session renaming', async () => {
    renderComponent();
    const historyBtn = screen.getByLabelText('Toggle history');
    fireEvent.click(historyBtn);

    // Click edit button
    const renameBtn = screen.getByTitle('Renommer');
    fireEvent.click(renameBtn);

    // Find input
    const input = screen.getByDisplayValue('Old Chat');
    fireEvent.change(input, { target: { value: 'New Title' } });
    
    // Press Enter to save
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockChat.renameSession).toHaveBeenCalledWith('hist-1', 'New Title');
  });

  it('handles session deletion', () => {
    renderComponent();
    const historyBtn = screen.getByLabelText('Toggle history');
    fireEvent.click(historyBtn);

    const deleteBtn = screen.getByTitle('Supprimer');
    fireEvent.click(deleteBtn);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockChat.deleteSession).toHaveBeenCalledWith('hist-1');
  });

  it('closes correctly on Escape key', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });
    
    fireEvent.keyDown(window, { key: 'Escape' });
    
    expect(onClose).toHaveBeenCalled();
  });
});
