"use client";

import { useState, useEffect } from "react";
import type { DrawingSet } from "@/lib/revisions/types";

type Props = {
  projectId: string;
  onSelect?: (set: DrawingSet) => void;
};

export function DrawingSetManager({ projectId, onSelect }: Props) {
  const [sets, setSets] = useState<DrawingSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/drawing-sets`)
      .then((r) => r.json())
      .then((data: { drawingSets?: DrawingSet[] }) => {
        setSets(data.drawingSets ?? []);
      })
      .catch(() => setError("Failed to load drawing sets"))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/drawing-sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { drawingSet?: DrawingSet };
      if (data.drawingSet) {
        setSets((prev) => [data.drawingSet!, ...prev]);
        setName("");
      }
    } catch {
      setError("Failed to create drawing set");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading drawing sets…</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-semibold text-lg">Drawing Sets</h2>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="New drawing set name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-3 py-1 text-sm flex-1"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="bg-blue-600 text-white px-4 py-1 rounded text-sm disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {sets.length === 0 ? (
        <p className="text-gray-400 text-sm">No drawing sets yet.</p>
      ) : (
        <ul className="divide-y border rounded">
          {sets.map((set) => (
            <li key={set.id}>
              <button
                onClick={() => onSelect?.(set)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm">{set.name}</div>
                {set.discipline && (
                  <div className="text-xs text-gray-400">{set.discipline}</div>
                )}
                {set.currentVersionId && (
                  <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                    Has current version
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
