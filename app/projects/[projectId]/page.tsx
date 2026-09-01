import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Project" };

const MOCK_DRAWINGS = [
  { id: "m-101", name: "M-101 — HVAC Floor Plan L1", sheets: 1, rev: "Rev 3", updated: "2026-08-28", status: "Current" },
  { id: "m-102", name: "M-102 — HVAC Floor Plan L2", sheets: 1, rev: "Rev 2", updated: "2026-08-20", status: "Current" },
  { id: "m-200", name: "M-200 — Equipment Schedule", sheets: 2, rev: "Rev 1", updated: "2026-08-10", status: "Current" },
  { id: "m-300", name: "M-300 — Piping Diagram", sheets: 3, rev: "Rev 0", updated: "2026-07-30", status: "Superseded" },
];

const MOCK_STATS = [
  { label: "Drawings", value: "12" },
  { label: "Open markups", value: "7" },
  { label: "Equipment count", value: "43" },
  { label: "Duct LF", value: "1,240" },
];

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const name = projectId.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-full bg-[#0b1016]">
      <header className="border-b border-[#1e2830] bg-[#0d1520] px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center gap-4">
          <Link href="/projects" className="flex items-center gap-2 text-[#667784] hover:text-white transition-colors">
            <span className="grid size-9 place-items-center rounded-lg bg-[#ff6a1a] text-white text-xl shadow-[0_0_20px_#ff6a1a40]">⚡</span>
            <span className="text-[13px] font-bold tracking-[.12em]">SUPPABUILT</span>
          </Link>
          <span className="text-[#3a4550]">/</span>
          <span className="text-[13px] font-semibold text-white">{name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{name}</h1>
            <span className="inline-flex items-center rounded border border-green-500/20 bg-green-500/15 px-2 py-1 text-[11px] font-bold tracking-wide text-green-400">ACTIVE</span>
          </div>
          <p className="mt-1 text-sm text-[#778493]">VRF + DOAS · Miami Beach, FL</p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MOCK_STATS.map(stat => (
            <div key={stat.label} className="rounded-xl border border-[#1e2830] bg-[#0d1520] p-4">
              <div className="text-[11px] text-[#556370]">{stat.label}</div>
              <div className="mt-1 text-2xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[13px] font-bold tracking-[.1em] text-[#8e9aa6]">DRAWING SETS</h2>
          <button className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#2a3540] bg-[#0d1520] px-3 text-[11px] font-semibold text-[#bdc6ce] hover:border-[#ff6a1a] hover:text-[#ff7a32] transition-colors">
            + Upload drawing
          </button>
        </div>

        <div className="grid gap-2">
          {MOCK_DRAWINGS.map(drawing => (
            <Link
              key={drawing.id}
              href={`/projects/${projectId}/studio/${drawing.id}`}
              className="group flex items-center gap-4 rounded-xl border border-[#1e2830] bg-[#0d1520] p-4 transition hover:border-[#ff6a1a]/30 hover:bg-[#111d28]"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#141d26] text-[#ff7a32] text-lg border border-[#2a3540]">
                📄
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white group-hover:text-[#ff7a32] transition-colors">{drawing.name}</div>
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[#667784]">
                  <span>{drawing.rev}</span>
                  <span>·</span>
                  <span>{drawing.sheets} sheet{drawing.sheets !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>Updated {drawing.updated}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border ${
                  drawing.status === "Current"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-[#2a3540] text-[#667784] border-transparent"
                }`}>
                  {drawing.status.toUpperCase()}
                </span>
                <span className="text-[13px] font-bold text-[#ff6a1a] opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
