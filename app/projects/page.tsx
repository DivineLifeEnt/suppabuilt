import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Projects" };

const MOCK_PROJECTS = [
  {
    id: "ocean-house-miami",
    name: "Ocean House Miami",
    address: "1 Ocean Dr, Miami Beach, FL 33139",
    status: "Active",
    drawings: 12,
    lastActivity: "2026-08-28",
    system: "VRF + DOAS",
  },
  {
    id: "westside-office-park",
    name: "Westside Office Park",
    address: "4200 NW 107th Ave, Doral, FL 33178",
    status: "Bidding",
    drawings: 7,
    lastActivity: "2026-08-20",
    system: "Rooftop RTU",
  },
  {
    id: "palm-beach-residence",
    name: "Palm Beach Residence",
    address: "15 N County Rd, Palm Beach, FL 33480",
    status: "Complete",
    drawings: 4,
    lastActivity: "2026-07-15",
    system: "Mini-Split",
  },
];

const statusColor: Record<string, string> = {
  Active: "bg-green-500/15 text-green-400 border-green-500/20",
  Bidding: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Complete: "bg-[#3a4550] text-[#8d99a5] border-transparent",
};

export default function ProjectsPage() {
  return (
    <div className="min-h-full bg-[#0b1016]">
      <header className="border-b border-[#1e2830] bg-[#0d1520] px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-[#ff6a1a] text-white text-xl shadow-[0_0_20px_#ff6a1a40]">⚡</div>
            <div>
              <div className="text-[13px] font-bold tracking-[.12em] text-white">SUPPABUILT</div>
              <div className="text-[9px] font-bold tracking-[.28em] text-[#ff7a32]">STUDIO</div>
            </div>
          </div>
          <div className="text-[11px] text-[#667784]">Suppa Mechanical LLC</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Projects</h1>
            <p className="mt-1 text-sm text-[#778493]">All HVAC construction projects</p>
          </div>
          <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#ff6a1a] px-4 text-sm font-semibold text-white hover:bg-[#ff7b34] transition-colors">
            + New project
          </button>
        </div>

        <div className="grid gap-3">
          {MOCK_PROJECTS.map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group flex items-center gap-4 rounded-xl border border-[#1e2830] bg-[#0d1520] p-5 transition hover:border-[#2d3d4d] hover:bg-[#111d28]"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#ff6a1a]/10 text-[#ff7a32] text-xl border border-[#ff6a1a]/20">
                📋
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white group-hover:text-[#ff7a32] transition-colors">{project.name}</span>
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${statusColor[project.status]}`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] text-[#778493] truncate">{project.address}</div>
              </div>
              <div className="hidden sm:flex items-center gap-8 text-right">
                <div>
                  <div className="text-[11px] text-[#556370]">System</div>
                  <div className="text-[12px] font-medium text-[#bdc6ce]">{project.system}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#556370]">Drawings</div>
                  <div className="text-[12px] font-medium text-[#bdc6ce]">{project.drawings}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#556370]">Last activity</div>
                  <div className="text-[12px] font-medium text-[#bdc6ce]">{project.lastActivity}</div>
                </div>
              </div>
              <span className="text-[#556370] group-hover:text-[#ff7a32] transition-colors">›</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
