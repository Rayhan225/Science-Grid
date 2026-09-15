"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

export default function XMLConverterPage() {
  const [fileName, setFileName] = useState("");
  const [converted, setConverted] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setFileName(file.name);
      setConverted(false);
    }
  };

  const handleConvert = () => {
    if (!fileName) {
      return;
    }

    setConverted(true);
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
            Repository XML Converter
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            Convert your research document into a structured XML format
            suitable for academic repositories.
          </p>
        </div>
      </section>

      {/* Converter */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Upload */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">
              Upload Document
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Select a research document to prepare it for XML conversion.
            </p>

            <label className="mt-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-slate-400 hover:bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                ↑
              </div>

              <p className="mt-4 text-sm font-semibold">
                Choose a document
              </p>

              <p className="mt-1 text-xs text-slate-500">
                PDF, DOCX or research manuscript
              </p>

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {fileName && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Selected File
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {fileName}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleConvert}
              disabled={!fileName}
              className="mt-5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Convert to XML
            </button>
          </div>

          {/* XML Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  XML Preview
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Preview the generated repository structure.
                </p>
              </div>

              {converted && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Converted
                </span>
              )}
            </div>

            {!converted ? (
              <div className="mt-6 flex min-h-80 items-center justify-center rounded-xl bg-slate-950 p-6 text-center">
                <p className="max-w-sm text-sm leading-6 text-slate-400">
                  Upload a document and click “Convert to XML” to see the
                  generated XML structure.
                </p>
              </div>
            ) : (
              <div className="mt-6 min-h-80 overflow-auto rounded-xl bg-slate-950 p-6">
                <pre className="text-sm leading-7 text-slate-300">
{`<?xml version="1.0" encoding="UTF-8"?>

<article>
  <title>Research Article</title>

  <metadata>
    <author>Researcher Name</author>
    <journal>Academic Journal</journal>
    <year>2026</year>
  </metadata>

  <abstract>
    Research abstract content...
  </abstract>

  <body>
    <section>
      <title>Introduction</title>
      <paragraph>
        Research content goes here...
      </paragraph>
    </section>
  </body>
</article>`}
                </pre>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Information */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold">
                Structured Metadata
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Organize title, author, journal and publication information
                into structured fields.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold">
                Repository Ready
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Prepare research content in a structured format for academic
                distribution.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold">
                XML Preview
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review the generated XML structure before final export.
              </p>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}