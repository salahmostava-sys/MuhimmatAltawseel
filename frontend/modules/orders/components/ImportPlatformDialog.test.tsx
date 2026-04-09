import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportPlatformDialog } from './ImportPlatformDialog';

const apps = [
  { id: 'app-1', name: 'App One', name_en: 'App One' },
  { id: 'app-2', name: 'App Two', name_en: 'App Two' },
];

describe('ImportPlatformDialog', () => {
  it('defaults to the all-platforms option when opened', () => {
    render(
      <ImportPlatformDialog
        open
        apps={apps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /جميع المنصات/i })).toHaveAttribute('data-state', 'checked');
  });

  it('resets back to all platforms when reopened', () => {
    const { rerender } = render(
      <ImportPlatformDialog
        open
        apps={apps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'App One' }));
    expect(screen.getByRole('radio', { name: 'App One' })).toHaveAttribute('data-state', 'checked');

    rerender(
      <ImportPlatformDialog
        open={false}
        apps={apps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    rerender(
      <ImportPlatformDialog
        open
        apps={apps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('radio', { name: /جميع المنصات/i })).toHaveAttribute('data-state', 'checked');
  });

  it('passes undefined when confirming the all-platforms option', () => {
    const onConfirm = vi.fn();

    render(
      <ImportPlatformDialog
        open
        apps={apps}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /متابعة الاستيراد/i }));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });
});
