import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

function SmokeMessage() {
  return <button type="button">Teste da interface</button>;
}

it('renders a React component in the DOM environment', () => {
  render(<SmokeMessage />);

  expect(screen.getByRole('button', { name: 'Teste da interface' })).toBeInTheDocument();
});
