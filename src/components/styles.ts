// Shared class lists for recurring controls. Plain strings (not a "use client" module) so both
// Server and Client Components can use them; colors come from the theme tokens in globals.css.

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export const primaryButtonClass = `rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const ghostButtonClass = `rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-foreground ${focusRing}`;

export const secondaryButtonClass = `rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted ${focusRing}`;

/** Opens a destructive flow; the confirm step uses dangerButtonClass. */
export const dangerOutlineButtonClass = `rounded-md border border-danger-border bg-surface px-4 py-2 text-sm font-medium text-danger hover:bg-danger-surface ${focusRing}`;

export const dangerButtonClass = `rounded-md bg-danger-solid px-4 py-2.5 text-sm font-medium text-danger-solid-foreground hover:bg-danger-solid-hover disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

export const inputClass =
  'rounded-md border border-input bg-surface px-3 py-2 text-base text-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-invalid:border-danger';

export const alertClass =
  'rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-sm text-danger';
