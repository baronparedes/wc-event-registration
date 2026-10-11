import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  SortableTableHeaderCell,
} from '../ListTable';

describe('ListTable components', () => {
  it('renders standard table structure with density context', () => {
    render(
      <ListTable density="dense" data-testid="table">
        <ListTableHead>
          <ListTableHeaderRow variant="muted">
            <ListTableHeaderCell>Col 1</ListTableHeaderCell>
            <ListTableHeaderCell>Col 2</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody divider="default">
          <ListTableRow hover="muted">
            <ListTableCell>Cell 1</ListTableCell>
            <ListTableCell>Cell 2</ListTableCell>
          </ListTableRow>
        </ListTableBody>
      </ListTable>,
    );

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Col 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  describe('SortableTableHeaderCell', () => {
    it('renders inactive sort button and calls onSort when clicked', () => {
      const handleSort = vi.fn();
      render(
        <ListTable>
          <ListTableHead>
            <ListTableHeaderRow>
              <SortableTableHeaderCell onSort={handleSort}>Name</SortableTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
        </ListTable>,
      );

      const button = screen.getByRole('button', { name: /^name$/i });
      expect(button).toBeInTheDocument();

      fireEvent.click(button);
      expect(handleSort).toHaveBeenCalledTimes(1);
    });

    it('renders active asc and desc states with appropriate alignment', () => {
      const { rerender } = render(
        <ListTable>
          <ListTableHead>
            <ListTableHeaderRow>
              <SortableTableHeaderCell active direction="asc" align="center">
                Score
              </SortableTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
        </ListTable>,
      );

      const th = screen.getByRole('columnheader');
      expect(th).toHaveClass('text-center');

      rerender(
        <ListTable>
          <ListTableHead>
            <ListTableHeaderRow>
              <SortableTableHeaderCell active direction="desc" align="right">
                Score
              </SortableTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
        </ListTable>,
      );

      expect(th).toHaveClass('text-right');
    });
  });
});
