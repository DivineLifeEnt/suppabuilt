"use client";

import { useState, useEffect } from "react";
import type { DrawingPageVersion } from "@/lib/revisions/types";

type Props = {
  versionId: string;
};

export function SheetMetadataEditor({ versionId }: Props) {
  const [pages, setPages] = useState<DrawingPageVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, Partial<DrawingPageVersion>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/drawing-versions/${versionId}/pages`)
      .then((r) => r.json())
      .then((data: { pages?: DrawingPageVersion[] }) => setPages(data.pages ?? []))
      .finally(() => setLoading(false));
  }, [versionId]);

  function setEdit(pageId: string, field: keyof DrawingPageVersion, value: string) {
    setEdits((prev) => ({
      ...prev,
      [pageId]: { ...prev[pageId], [field]: value },
    }));
  }

  async function savePage(page: DrawingPageVersion) {
    setSaving(page.id);
    setError(null);
    const patch = edits[page.id] ?? {};
    try {
      const res = await fetch(`/api/drawing-page-versions/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, expectedRevision: page.revision }),
      });
      const data = (await res.json()) as { page?: DrawingPageVersion };
      if (data.page) {
        setPages((prev) => prev.map((p) => (p.id === page.id ? data.page! : p)));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[page.id];
          return next;
        });
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading pages…</div>;

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold">Sheet Metadata</h3>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="overflow-x-auto">
        <table className="text-sm w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 pr-4">Page</th>
              <th className="pb-2 pr-4">Sheet #</th>
              <th className="pb-2 pr-4">Title</th>
              <th className="pb-2 pr-4">Discipline</th>
              <th className="pb-2 pr-4">Rev Label</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => {
              const patch = edits[page.id] ?? {};
              const isDirty = Object.keys(patch).length > 0;
              return (
                <tr key={page.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-500">{page.pageIndex + 1}</td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={(patch.sheetNumber as string | undefined) ?? page.sheetNumber ?? ""}
                      onChange={(e) => setEdit(page.id, "sheetNumber", e.target.value)}
                      className="border rounded px-2 py-0.5 text-xs w-20"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={(patch.sheetTitle as string | undefined) ?? page.sheetTitle ?? ""}
                      onChange={(e) => setEdit(page.id, "sheetTitle", e.target.value)}
                      className="border rounded px-2 py-0.5 text-xs w-40"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={(patch.discipline as string | undefined) ?? page.discipline ?? ""}
                      onChange={(e) => setEdit(page.id, "discipline", e.target.value)}
                      className="border rounded px-2 py-0.5 text-xs w-24"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={(patch.revisionLabel as string | undefined) ?? page.revisionLabel ?? ""}
                      onChange={(e) => setEdit(page.id, "revisionLabel", e.target.value)}
                      className="border rounded px-2 py-0.5 text-xs w-20"
                    />
                  </td>
                  <td className="py-2">
                    {isDirty && (
                      <button
                        onClick={() => savePage(page)}
                        disabled={saving === page.id}
                        className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      >
                        {saving === page.id ? "Saving…" : "Save"}
                      </button>
                    )}
                    {page.userConfirmedMetadata && !isDirty && (
                      <span className="text-xs text-green-500">✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
