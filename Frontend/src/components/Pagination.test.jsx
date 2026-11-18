import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('hides controls when there is only one page', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables previous on the first page and reports clicked pages', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={4} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows ellipses and the surrounding page numbers in the middle', () => {
    render(<Pagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />);
    expect(screen.getAllByText('...')).toHaveLength(2);
    for (const page of ['1', '4', '5', '6', '10']) expect(screen.getByRole('button', { name: page })).toBeInTheDocument();
  });
});
