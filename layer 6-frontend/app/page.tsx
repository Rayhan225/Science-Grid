import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          
          {/* Hero Content */}
          <div>
            <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
              Academic Publishing Workspace
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Your research.
              <span className="block text-slate-500">
                Ready to publish.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              ScholarGrid brings research formatting, abstract matching,
              repository conversion, and scientific poster creation into one
              simple workspace.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#tools"
                className="rounded-xl bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700"
              >
                Explore Tools
              </a>

              <a
                href="/templates"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Browse Templates
              </a>
            </div>

            <div className="mt-10 flex gap-8 text-sm text-slate-500">
              <div>
                <p className="text-2xl font-bold text-slate-900">4+</p>
                <p className="mt-1">Publishing Tools</p>
              </div>

              <div>
                <p className="text-2xl font-bold text-slate-900">3+</p>
                <p className="mt-1">Journal Templates</p>
              </div>

              <div>
                <p className="text-2xl font-bold text-slate-900">1</p>
                <p className="mt-1">Unified Workspace</p>
              </div>
            </div>
          </div>

          {/* Hero Preview */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
              
              <div className="rounded-2xl bg-slate-100 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                      ScholarGrid
                    </p>

                    <h2 className="mt-2 text-xl font-bold">
                      Research Workspace
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-bold text-white">
                    S
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      ▦
                    </div>

                    <p className="mt-3 text-sm font-semibold">
                      Templates
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Journal formatting
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      ✦
                    </div>

                    <p className="mt-3 text-sm font-semibold">
                      Matcher
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Find publication areas
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      &lt;/&gt;
                    </div>

                    <p className="mt-3 text-sm font-semibold">
                      XML Converter
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Repository-ready files
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      ▣
                    </div>

                    <p className="mt-3 text-sm font-semibold">
                      Poster
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Scientific layouts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Tools */}
      <section
        id="tools"
        className="border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20">
          
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Workspace
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need to prepare research
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              Use ScholarGrid's publishing tools to format, analyze, convert,
              and present your academic work.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {/* Templates */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ▦
              </div>

              <h3 className="mt-6 text-lg font-semibold">
                Journal Templates
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Choose professional formatting structures for IEEE, Springer,
                Elsevier, and other publications.
              </p>

              <a
                href="/templates"
                className="mt-6 inline-block text-sm font-semibold text-slate-900"
              >
                Explore Templates →
              </a>
            </div>

            {/* Matcher */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ✦
              </div>

              <h3 className="mt-6 text-lg font-semibold">
                Abstract Matcher
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Analyze your abstract and identify suitable publication areas
                for your research.
              </p>

              <a
                href="/abstract-matcher"
                className="mt-6 inline-block text-sm font-semibold text-slate-900"
              >
                Match Abstract →
              </a>
            </div>

            {/* XML */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                &lt;/&gt;
              </div>

              <h3 className="mt-6 text-lg font-semibold">
                XML Converter
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Prepare research documents in structured XML format for
                academic repositories.
              </p>

              <a
                href="/xml-converter"
                className="mt-6 inline-block text-sm font-semibold text-slate-900"
              >
                Convert Document →
              </a>
            </div>

            {/* Poster */}
            <div className="group rounded-2xl border border-slate-200 bg-slate-50 p-6 transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ▣
              </div>

              <h3 className="mt-6 text-lg font-semibold">
                Scientific Poster
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Generate clean and structured poster layouts for academic
                presentations.
              </p>

              <a
                href="/poster-generator"
                className="mt-6 inline-block text-sm font-semibold text-slate-900"
              >
                Create Poster →
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Workflow */}
      <section
        id="documentation"
        className="mx-auto max-w-7xl px-6 py-20"
      >
        <div className="grid gap-12 lg:grid-cols-2">
          
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Simple Workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
              From research to publication
            </h2>

            <p className="mt-5 max-w-xl leading-7 text-slate-600">
              ScholarGrid organizes the major preparation steps into a single
              workflow so researchers can spend more time on their research
              and less time dealing with formatting.
            </p>
          </div>

          <div className="space-y-4">
            
            <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                01
              </div>

              <div>
                <h3 className="font-semibold">
                  Choose a Template
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Select the formatting structure that fits your target
                  publication.
                </p>
              </div>
            </div>

            <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                02
              </div>

              <div>
                <h3 className="font-semibold">
                  Match Your Research
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Use your abstract to explore relevant publication areas.
                </p>
              </div>
            </div>

            <div className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                03
              </div>

              <div>
                <h3 className="font-semibold">
                  Prepare & Present
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Convert your document and create a professional scientific
                  poster.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            ScholarGrid
          </p>

          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Ready to publish smarter?
          </h2>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-300">
            Start with a journal template, analyze your abstract, convert
            your research, or create a scientific poster.
          </p>

          <a
            href="#tools"
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-200"
          >
            Start Your Workspace
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>
            © 2026 ScholarGrid. Academic Publishing Workspace.
          </p>

          <div className="flex gap-6">
            <a
              href="/templates"
              className="transition hover:text-white"
            >
              Templates
            </a>

            <a
              href="/abstract-matcher"
              className="transition hover:text-white"
            >
              Abstract Matcher
            </a>

            <a
              href="/xml-converter"
              className="transition hover:text-white"
            >
              XML Converter
            </a>

            <a
              href="/poster-generator"
              className="transition hover:text-white"
            >
              Poster
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}