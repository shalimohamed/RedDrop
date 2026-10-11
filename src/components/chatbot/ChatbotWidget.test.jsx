import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const askChatbotMock = vi.fn();
vi.mock('../../services/chatbot', () => ({ askChatbot: (...args) => askChatbotMock(...args) }));

const { default: ChatbotWidget } = await import('./ChatbotWidget');

beforeEach(() => {
  askChatbotMock.mockReset();
  Element.prototype.scrollTo = vi.fn();
});

describe('ChatbotWidget', () => {
  it('is collapsed by default, showing only the launcher button', () => {
    render(<ChatbotWidget />);
    expect(screen.getByRole('button', { name: /open chat assistant/i })).toBeInTheDocument();
    expect(screen.queryByText(/RedDrop Assistant/i)).not.toBeInTheDocument();
  });

  it('opens to show the greeting and lets the user send a message', async () => {
    askChatbotMock.mockResolvedValue('You are eligible to donate.');
    render(<ChatbotWidget />);

    await userEvent.click(screen.getByRole('button', { name: /open chat assistant/i }));
    expect(screen.getByText(/Hi, I'm the RedDrop assistant/i)).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/ask about donating/i), 'Am I eligible?');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    expect(screen.getByText('Am I eligible?')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('You are eligible to donate.')).toBeInTheDocument();
    });
    expect(askChatbotMock).toHaveBeenCalledTimes(1);
  });

  it('shows the error message in the conversation if the chatbot call fails', async () => {
    askChatbotMock.mockRejectedValue(new Error('The chatbot is unavailable right now. Please try again shortly.'));
    render(<ChatbotWidget />);

    await userEvent.click(screen.getByRole('button', { name: /open chat assistant/i }));
    await userEvent.type(screen.getByPlaceholderText(/ask about donating/i), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(screen.getByText(/chatbot is unavailable right now/i)).toBeInTheDocument();
    });
  });

  it('does not send an empty message', async () => {
    render(<ChatbotWidget />);
    await userEvent.click(screen.getByRole('button', { name: /open chat assistant/i }));
    await userEvent.click(screen.getByRole('button', { name: /^send$/i }));
    expect(askChatbotMock).not.toHaveBeenCalled();
  });

  it('closes when the close button is clicked', async () => {
    render(<ChatbotWidget />);
    await userEvent.click(screen.getByRole('button', { name: /open chat assistant/i }));
    await userEvent.click(screen.getByRole('button', { name: /close chat$/i }));
    expect(screen.queryByText(/RedDrop Assistant/i)).not.toBeInTheDocument();
  });
});
