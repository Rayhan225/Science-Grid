export default function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
            S
          </div>

          <span className="text-xl font-semibold tracking-tight">
            ScholarGrid
          </span>
        </a>

        {/* Navigation */}
        <div className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
          <a
            href="/"
            className="transition hover:text-slate-900"
          >
            Dashboard
          </a>

          <a
            href="/templates"
            className="transition hover:text-slate-900"
          >
            Templates
          </a>

          <a
            href="/#tools"
            className="transition hover:text-slate-900"
          >
            Tools
          </a>

          <a
            href="/#documentation"
            className="transition hover:text-slate-900"
          >
            Documentation
          </a>
        </div>

        {/* Get Started */}
        <a
          href="/#tools"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Get Started
        </a>

      </div>
    </nav>
  );
}