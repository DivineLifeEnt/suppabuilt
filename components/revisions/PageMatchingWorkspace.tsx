"use client";

import { useState, useEffect } from "react";
import type { PageMatch, DrawingPageVersion } from "@/lib/revisions/types";
import { PageMatchRow } from "./PageMatchRow";

type Props = {
  baseVersionId: string;
  comparisonVersionId: string;
};

export function PageMatchingWorkspace({ baseVersionId, comparisonVersionId }: Props) {
  const [matches, setMatches] = useState<PageMatch[]>([]);
  const [basePages, setBasePages] = useState<DrawingPageVersion[]>([]);
  const [compPages, setCompPages] = useState<DrawingPageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      fetch(`/api/drawing-versions/${baseVersionId}/page-matches?comparisonVersionId=${comparisonVersionId}`).then((r) => r.json()),
      fetch(`/api/drawing-versions/${baseVersionId}/pages`).then((r) => r.json()),
      fetch(`/api/drawing-versions/${comparisonVersionId}/pages`).then((r) => r.json()),
    ]).then(([matchData, baseData, compData]: [
      { matches?: PageMatch[] },
      { pages?: DrawingPageVersion[] },
      { pages?: DrawingPageVersion[] }
    ]) => {
      setMatches(matchData.matches ?? []);
      setBasePages(baseData.pages ?? []);
      setCompPages(compData.pages ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [baseVersionId, comparisonVersionId]);

  async function handlePropose() {
    setProposing(true);
    setError(null);
    try {
      await fetch(`/api/drawing-versions/${baseVersionId}/page-matches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparisonVersionId }),
      });
      load();
    } catch {
      setError("Failed to propose matches");
    } finally {
      setProposing(false);
    }
  }

  async function handleUpdate(matchId: string, update: { userConfirmed?: boolean; status?: PageMatch["status"] }) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const res = await fetch(`/api/page-matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...update, expectedRevision: match.revision }),
    });
    const data = (await res.json()) as { match?: PageMatch };
    if (data.match) {
      setMatches((prev) => prev.map((m) => (m.id === matchId ? data.match! : m)));
    }
  }

  async function handleFinalize() {
    setFinalizing(true);
    setError(null);
    try {
      const res = await fetch(`/api/drawing-versions/${baseVersionId}/page-matches/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparisonVersionId }),
      });
      const data = (await res.json()) as { matches?: PageMatch[]; error?: { message?: string } };
      if (!res.ok) {
        setError(data.error?.message ?? "Finalize failed");
        return;
      }
      if (data.matches) setMatches(data.matches);
    } catch {
      setError("Failed to finalize matches");
    } finally {
      setFinalizing(false);
    }
  }

  const pageMap = new Map<string, DrawingPageVersion>([
    ...basePages.map((p): [string, DrawingPageVersion] => [p.id, p]),
    ...compPages.map((p): [string, DrawingPageVersion] => [p.id, p]),
  ]);

  const ambiguousCount = matches.filter((m) => m.status === "ambiguous").length;
  const canFinalize = matches.length > 0 && ambiguousCount === 0;

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Page Matching</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePropose}
            disabled={proposing}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {proposing ? "Proposing…" : "Auto-propose"}
          </button>
          <button
            onClick={handleFinalize}
            disabled={!canFinalize || finalizing}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {finalizing ? "Finalizing…" : "Finalize"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {ambiguousCount > 0 && (
        <div className="text-yellow-700 text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
          {ambiguousCount} ambiguous match{ambiguousCount > 1 ? "es" : ""} need manual resolution before finalizing.
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-gray-400 text-sm">No matches yet. Click &quot;Auto-propose&quot; to generate matches.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="border-b text-xs text-gray-500">
                <th className="text-left pb-2 px-4 w-1/3">Base Page</th>
                <th className="text-center pb-2 px-4">Match</th>
                <th className="text-left pb-2 px-4 w-1/3">Comparison Page</th>
                <th className="text-left pb-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <PageMatchRow
                  key={match.id}
                  match={match}
                  basePage={match.basePageId ? pageMap.get(match.basePageId) : null}
                  compPage={match.comparisonPageId ? pageMap.get(match.comparisonPageId) : null}
                  onUpdate={handleUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
