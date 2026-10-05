// Typography for TipTap output. Shared by the editor and (later) the read-only public page,
// so it lives outside any "use client" module.
export const noteContentClass = [
  'text-base leading-relaxed text-foreground',
  '[&_p]:my-2',
  '[&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-semibold',
  '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold',
  '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
  '[&_code]:rounded [&_code]:bg-surface-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm',
  '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-codeblock [&_pre]:p-3 [&_pre]:text-codeblock-foreground',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_hr]:my-6 [&_hr]:border-border',
].join(' ');
