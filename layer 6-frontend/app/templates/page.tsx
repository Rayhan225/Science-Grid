import Navbar from "@/components/Navbar";

export default function TemplatesPage() {
  const templates = [
    {
      name: "IEEE Template",
      description: "Standard IEEE research paper formatting.",
    },
    {
      name: "Springer Template",
      description: "Clean formatting structure for Springer publications.",
    },
    {
      name: "Elsevier Template",
      description: "Publication-ready structure for Elsevier journals.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Header */}
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            ScholarGrid
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Journal Template Gallery
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Choose a professional formatting template for your research
            manuscript and prepare it for publication.
          </p>
        </div>
      </section>

      {/* Templates */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.name}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* Template Preview */}
              <div className="mb-6 flex h-44 items-center justify-center rounded-xl bg-slate-100">
                <div className="h-32 w-24 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="h-2 w-12 rounded bg-slate-300" />
                  <div className="mt-3 h-1.5 w-full rounded bg-slate-200" />
                  <div className="mt-2 h-1.5 w-4/5 rounded bg-slate-200" />
                  <div className="mt-5 h-1.5 w-full rounded bg-slate-200" />
                  <div className="mt-2 h-1.5 w-5/6 rounded bg-slate-200" />
                  <div className="mt-2 h-1.5 w-3/4 rounded bg-slate-200" />
                </div>
              </div>

              {/* Template Information */}
              <h2 className="text-xl font-semibold">
                {template.name}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {template.description}
              </p>

              {/* Button */}
              <button
                type="button"
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Section */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="rounded-2xl bg-slate-900 px-8 py-10 text-white">
            <h2 className="text-2xl font-bold">
              Can't find your journal?
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              ScholarGrid can be extended with additional journal formatting
              templates to support different publication requirements.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}