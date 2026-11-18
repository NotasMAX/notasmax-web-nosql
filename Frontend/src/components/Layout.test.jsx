import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Layout from './Layout.jsx';

vi.mock('./Header.jsx', () => ({ default: () => <header>Header mock</header> }));
vi.mock('./Navigation.jsx', () => ({ default: () => <nav>Navigation mock</nav> }));

describe('Layout', () => {
  it('composes the header, navigation, and page content in the main region', () => {
    render(<Layout><h1>Turmas</h1></Layout>);
    expect(screen.getByText('Header mock')).toBeInTheDocument();
    expect(screen.getByText('Navigation mock')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Turmas' }));
  });
});
