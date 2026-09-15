"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

export default function PosterGeneratorPage() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [institution, setInstitution] = useState("");
  const [abstract, setAbstract] = useState("");
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    if (!title.trim() || !author.trim()) {
      return;
    }

    setGenerated(true);
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
            Scientific Poster Generator
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Create a clean scientific poster layout by entering your research
            information and previewing the final design.
          </p>
        </div>
      </section>

      {/* Generator */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">

          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">
              Research Information
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the basic information for your scientific poster.
            </p>

            <div className="mt-6 space-y-5">

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Research Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter research title"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                />
              </div>

              {/* Author */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Author
                </label>

                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                />
              </div>

              {/* Institution */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Institution
                </label>

                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="University or institution"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                />
              </div>

              {/* Abstract */}
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Abstract
                </label>

                <textarea
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Enter a short research abstract"
                  className="mt-2 min-h-32 w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                />
              </div>

              {/* Generate */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!title.trim() || !author.trim()}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Generate Poster
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Poster Preview
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Your scientific poster will appear here.
                </p>
              </div>

              {generated && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Generated
                </span>
              )}
            </div>

            {!generated ? (
              <div className="mt-6 flex min-h-[600px] items-center justify-center rounded-xl bg-slate-100 text-center">
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  Enter your research information and click
                  {" "}
                  <span className="font-semibold">
                    Generate Poster
                  </span>
                  {" "}
                  to preview your scientific poster.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">

                {/* Poster Header */}
                <div className="border-b border-slate-200 px-8 py-8 text-center">
                  <h1 className="text-3xl font-bold tracking-tight">
                    {title}
                  </h1>

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {author}
                  </p>

                  {institution && (
                    <p className="mt-1 text-sm text-slate-500">
                      {institution}
                    </p>
                  )}
                </div>

                {/* Poster Body */}
                <div className="grid gap-5 p-6 md:grid-cols-2">

                  {/* Abstract */}
                  <div className="rounded-xl bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold">
                      Abstract
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {abstract ||
                        "This section contains a summary of the research work, methodology, findings, and key contributions."}
                    </p>
                  </div>

                  {/* Introduction */}
                  <div className="rounded-xl bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold">
                      Introduction
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      This section introduces the research problem, background,
                      and motivation behind the study.
                    </p>
                  </div>

                  {/* Methodology */}
                  <div className="rounded-xl bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold">
                      Methodology
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Describe the methods, dataset, tools, and experimental
                      process used in the research.
                    </p>
                  </div>

                  {/* Results */}
                  <div className="rounded-xl bg-slate-50 p-5">
                    <h2 className="text-lg font-semibold">
                      Results
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Present the main findings and important outcomes of the
                      research.
                    </p>
                  </div>

                  {/* Conclusion */}
                  <div className="rounded-xl bg-slate-50 p-5 md:col-span-2">
                    <h2 className="text-lg font-semibold">
                      Conclusion
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Summarize the major findings, contributions, and possible
                      future directions of the research.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Information */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Poster Design
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Designed for scientific communication
            </h2>

            <p className="mt-4 leading-7 text-slate-600">
              ScholarGrid organizes research information into a structured
              poster layout that is easy to read and suitable for academic
              presentations.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}