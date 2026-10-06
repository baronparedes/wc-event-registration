import { fireEvent, render, screen } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import {
  NotificationPrompt,
  NotificationPromptActions,
  NotificationPromptContent,
  NotificationPromptDescription,
  NotificationPromptDismissButton,
  NotificationPromptHeader,
  NotificationPromptIcon,
  NotificationPromptTitle,
} from '../NotificationPrompt';

describe('NotificationPrompt', () => {
  it('renders all compound components correctly with accessible semantics', () => {
    render(
      <NotificationPrompt ariaLabel="Test prompt banner">
        <NotificationPrompt.Header>
          <NotificationPrompt.Icon>
            <Bell data-testid="bell-icon" />
          </NotificationPrompt.Icon>
          <NotificationPrompt.Content>
            <NotificationPrompt.Title>Custom Title</NotificationPrompt.Title>
            <NotificationPrompt.Description>Custom Description</NotificationPrompt.Description>
          </NotificationPrompt.Content>
          <NotificationPrompt.DismissButton ariaLabel="Close custom prompt" />
        </NotificationPrompt.Header>
        <NotificationPrompt.Actions>
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </NotificationPrompt.Actions>
      </NotificationPrompt>,
    );

    const region = screen.getByRole('region', { name: /Test prompt banner/i });
    expect(region).toBeInTheDocument();
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Close custom prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument();
  });

  it('triggers onDismiss from context when DismissButton is clicked without explicit onClick', () => {
    const handleDismiss = vi.fn();

    render(
      <NotificationPrompt onDismiss={handleDismiss}>
        <NotificationPrompt.Header>
          <NotificationPrompt.DismissButton />
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    const closeBtn = screen.getByRole('button', { name: /Dismiss notification prompt/i });
    fireEvent.click(closeBtn);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('prefers explicit onClick over onDismiss context when supplied to DismissButton', () => {
    const handleDismissContext = vi.fn();
    const handleExplicitClick = vi.fn();

    render(
      <NotificationPrompt onDismiss={handleDismissContext}>
        <NotificationPrompt.Header>
          <NotificationPrompt.DismissButton onClick={handleExplicitClick} />
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    const closeBtn = screen.getByRole('button', { name: /Dismiss notification prompt/i });
    fireEvent.click(closeBtn);

    expect(handleExplicitClick).toHaveBeenCalledTimes(1);
    expect(handleDismissContext).not.toHaveBeenCalled();
  });

  it('supports custom heading tags for NotificationPromptTitle', () => {
    render(
      <NotificationPrompt>
        <NotificationPrompt.Header>
          <NotificationPrompt.Title as="h2">Heading 2 Title</NotificationPrompt.Title>
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    const heading = screen.getByRole('heading', { level: 2, name: /Heading 2 Title/i });
    expect(heading).toBeInTheDocument();
  });

  it('applies custom className and containerClassName', () => {
    const { container } = render(
      <NotificationPrompt className="custom-outer" containerClassName="custom-inner">
        <NotificationPrompt.Header className="custom-header">
          <NotificationPrompt.Title>Title</NotificationPrompt.Title>
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    const aside = container.querySelector('aside');
    expect(aside).toHaveClass('custom-outer');
    expect(aside?.firstElementChild).toHaveClass('custom-inner');
  });

  it('works with standalone named exports', () => {
    render(
      <NotificationPrompt>
        <NotificationPromptHeader>
          <NotificationPromptIcon>
            <Bell />
          </NotificationPromptIcon>
          <NotificationPromptContent>
            <NotificationPromptTitle>Named Export Title</NotificationPromptTitle>
            <NotificationPromptDescription>Named Export Desc</NotificationPromptDescription>
          </NotificationPromptContent>
          <NotificationPromptDismissButton />
        </NotificationPromptHeader>
        <NotificationPromptActions>
          <button type="button">OK</button>
        </NotificationPromptActions>
      </NotificationPrompt>,
    );

    expect(screen.getByText('Named Export Title')).toBeInTheDocument();
    expect(screen.getByText('Named Export Desc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OK/i })).toBeInTheDocument();
  });

  it('supports variants with appropriate default icons and border styles', () => {
    const { rerender, container } = render(
      <NotificationPrompt variant="success">
        <NotificationPrompt.Header>
          <NotificationPrompt.Icon />
          <NotificationPrompt.Title>Success</NotificationPrompt.Title>
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    const card = container.querySelector('aside > div');
    expect(card).toHaveClass('border-emerald-500/30');

    rerender(
      <NotificationPrompt variant="error">
        <NotificationPrompt.Header>
          <NotificationPrompt.Icon />
          <NotificationPrompt.Title>Error</NotificationPrompt.Title>
        </NotificationPrompt.Header>
      </NotificationPrompt>,
    );

    expect(container.querySelector('aside > div')).toHaveClass('border-rose-500/30');
  });

  it('supports position prop options', () => {
    const { rerender, container } = render(
      <NotificationPrompt position="static">
        <NotificationPrompt.Title>Static</NotificationPrompt.Title>
      </NotificationPrompt>,
    );

    expect(container.querySelector('aside')).toHaveClass('w-full select-none');
    expect(container.querySelector('aside')).not.toHaveClass('fixed');

    rerender(
      <NotificationPrompt position="relative">
        <NotificationPrompt.Title>Relative</NotificationPrompt.Title>
      </NotificationPrompt>,
    );

    expect(container.querySelector('aside')).toHaveClass('relative w-full max-w-md select-none');
  });

  it('renders progress bar when showProgressBar is true with duration', () => {
    const { rerender } = render(
      <NotificationPrompt variant="success" duration={4000} showProgressBar={true}>
        <NotificationPrompt.Title>Success with timer</NotificationPrompt.Title>
      </NotificationPrompt>,
    );

    const progressBar = screen.getByTestId('toast-progress-bar');
    const progressBarFill = screen.getByTestId('toast-progress-bar-fill');
    expect(progressBar).toBeInTheDocument();
    expect(progressBarFill).toHaveClass('bg-emerald-500');
    expect(progressBarFill).toHaveStyle({ '--toast-duration': '4000ms' });

    rerender(
      <NotificationPrompt variant="error" duration={3000} showProgressBar={false}>
        <NotificationPrompt.Title>Error without timer</NotificationPrompt.Title>
      </NotificationPrompt>,
    );

    expect(screen.queryByTestId('toast-progress-bar')).not.toBeInTheDocument();
  });
});
