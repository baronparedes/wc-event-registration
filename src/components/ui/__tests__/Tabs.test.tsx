import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

describe('Tabs Component', () => {
  it('renders uncontrolled tabs with defaultValue and shows active content', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'false');

    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
  });

  it('switches tabs on trigger click in uncontrolled mode', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs defaultValue="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);

    expect(onValueChange).toHaveBeenCalledWith('tab2');
    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveAttribute('aria-selected', 'false');

    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('respects controlled value prop', () => {
    const onValueChange = vi.fn();

    const { rerender } = render(
      <Tabs value="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Controlled Content 1</TabsContent>
        <TabsContent value="tab2">Controlled Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('Controlled Content 1')).toBeInTheDocument();

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);
    expect(onValueChange).toHaveBeenCalledWith('tab2');

    // Rerender with updated controlled value
    rerender(
      <Tabs value="tab2" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Controlled Content 1</TabsContent>
        <TabsContent value="tab2">Controlled Content 2</TabsContent>
      </Tabs>,
    );

    expect(screen.queryByText('Controlled Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Controlled Content 2')).toBeInTheDocument();
  });

  it('navigates through tabs using arrow keys, Home, and End', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs defaultValue="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });

    tab1.focus();

    // ArrowRight moves to Tab 2
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab2);
    expect(onValueChange).toHaveBeenCalledWith('tab2');

    // ArrowRight moves to Tab 3
    fireEvent.keyDown(tab2, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab3);
    expect(onValueChange).toHaveBeenCalledWith('tab3');

    // ArrowRight wraps to Tab 1
    fireEvent.keyDown(tab3, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab1);
    expect(onValueChange).toHaveBeenCalledWith('tab1');

    // ArrowLeft wraps to Tab 3
    fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tab3);
    expect(onValueChange).toHaveBeenCalledWith('tab3');

    // Home moves to Tab 1
    fireEvent.keyDown(tab3, { key: 'Home' });
    expect(document.activeElement).toBe(tab1);
    expect(onValueChange).toHaveBeenCalledWith('tab1');

    // End moves to Tab 3
    fireEvent.keyDown(tab1, { key: 'End' });
    expect(document.activeElement).toBe(tab3);
    expect(onValueChange).toHaveBeenCalledWith('tab3');
  });

  it('skips disabled tabs during interaction and keyboard navigation', () => {
    const onValueChange = vi.fn();

    render(
      <Tabs defaultValue="tab1" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>
            Tab 2 Disabled
          </TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const tab2 = screen.getByRole('tab', { name: 'Tab 2 Disabled' });
    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });

    fireEvent.click(tab2);
    expect(onValueChange).not.toHaveBeenCalled();

    tab1.focus();
    // ArrowRight skips disabled tab2 and focuses tab3
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tab3);
    expect(onValueChange).toHaveBeenCalledWith('tab3');
  });

  it('sets appropriate ARIA attributes connecting trigger and panel', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Panel 1</TabsContent>
      </Tabs>,
    );

    const trigger = screen.getByRole('tab', { name: 'Tab 1' });
    const panel = screen.getByRole('tabpanel');

    const triggerControls = trigger.getAttribute('aria-controls');
    const panelLabelledBy = panel.getAttribute('aria-labelledby');

    expect(triggerControls).toBeTruthy();
    expect(triggerControls).toBe(panel.getAttribute('id'));
    expect(panelLabelledBy).toBe(trigger.getAttribute('id'));
  });

  it('renders triggers with whitespace-nowrap and shrink-0 to prevent text squishing on mobile', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Long Tab Name 1</TabsTrigger>
          <TabsTrigger value="tab2">Long Tab Name 2</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const trigger = screen.getByRole('tab', { name: 'Long Tab Name 1' });
    expect(trigger).toHaveClass('whitespace-nowrap');
    expect(trigger).toHaveClass('shrink-0');
  });

  it('attempts to scroll active tab into view', () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  });

  it('renders left and right scroll buttons when container has overflow and scrolls on click', () => {
    const scrollByMock = vi.fn();
    window.HTMLElement.prototype.scrollBy = scrollByMock;

    const origScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      get() {
        return 600;
      },
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get() {
        return 300;
      },
    });

    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const rightBtn = screen.getByRole('button', { name: 'Scroll tabs right' });
    expect(rightBtn).toBeInTheDocument();

    fireEvent.click(rightBtn);
    expect(scrollByMock).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));

    if (origScrollWidth) {
      Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origScrollWidth);
    }
    if (origClientWidth) {
      Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClientWidth);
    }
  });

  it('throws error when subcomponents are rendered outside Tabs', () => {
    // Suppress console.error in Vitest for the expected thrown error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TabsTrigger value="tab1">Trigger</TabsTrigger>)).toThrow(
      '<TabsTrigger /> must be used within a <Tabs /> provider.',
    );

    spy.mockRestore();
  });
});
