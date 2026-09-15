"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

export default function AbstractMatcherPage() {
  const [abstract, setAbstract] = useState("");
  const [matched, setMatched] = useState(false);

  const handleMatch = () => {
    if (abstract.trim() === "") {
      return;
    }

    setMatched(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      {/* Header */}
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            ScholarGrid Tool
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Abstract Matcher
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Enter your research abstract and discover suitable publication
            areas based on your research topic.
          </p>
        </div>
      </section>

      {/* Main Tool */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Input */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">
              Your Abstract
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Paste your research abstract below.
            </p>

            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Enter your research abstract here..."
              className="mt-5 min-h-64 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
            />

            <button
              type="button"
              onClick={handleMatch}
              className="mt-5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Match Abstract
            </button>
          </div>

          {/* Results */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">
              Matching Results
            </h2>

            {!matched ? (
              <div className="mt-6 flex min-h-64 items-center justify-center rounded-xl bg-slate-50 text-center">
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  Your matching results will appear here after you submit
                  your abstract.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      IEEE Research Publications
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      92% Match
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Suitable for research involving computing, engineering,
                    artificial intelligence, and technology.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Springer Publications
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      86% Match
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Suitable for interdisciplinary academic and scientific
                    research.
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      Elsevier Publications
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                      81% Match
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Suitable for broad scientific and technical research
                    topics.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}