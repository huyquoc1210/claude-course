const advantages = [
  'Works directly in your terminal, IDE, desktop app, or browser',
  'Understands your whole codebase, not just the file you have open',
  'Edits files, runs commands, and fixes failing tests for you',
  'Handles git workflows: commits, branches, and pull requests',
  'Extensible with skills, hooks, subagents, and MCP servers',
  'Asks for permission before taking risky actions',
];

export default function Home() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-8 px-4'>
      <h1 className='text-4xl font-bold'>Hello World</h1>
      <section className='max-w-xl'>
        <h2 className='mb-4 text-2xl font-semibold'>Advantages of Claude Code</h2>
        <ul className='list-disc space-y-2 pl-6'>
          {advantages.map((advantage) => (
            <li key={advantage}>{advantage}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
