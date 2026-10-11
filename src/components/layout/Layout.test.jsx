import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./Navbar', () => ({ default: () => <nav>Mock Navbar</nav> }));
vi.mock('./Footer', () => ({ default: () => <footer>Mock Footer</footer> }));
vi.mock('../chatbot/ChatbotWidget', () => ({ default: () => <div>Mock Chatbot</div> }));

const { default: Layout } = await import('./Layout');

describe('Layout', () => {
  it('renders the navbar, children, footer, and chatbot widget', () => {
    render(
      <Layout>
        <p>Page content</p>
      </Layout>,
    );

    expect(screen.getByText('Mock Navbar')).toBeInTheDocument();
    expect(screen.getByText('Page content')).toBeInTheDocument();
    expect(screen.getByText('Mock Footer')).toBeInTheDocument();
    expect(screen.getByText('Mock Chatbot')).toBeInTheDocument();
  });
});
