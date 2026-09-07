"use client";

import { useState, useRef } from "react";
import type { DrawingSetVersion } from "@/lib/revisions/types";

type Props = {
  drawingSetId: string;
  onUploaded?: (version: DrawingSetVersion) => void;
  onClose?: () => void;
};

export function VersionUploadDialog({ drawingSetId, onUploaded, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [revisionName, setRevisionName] = useState("");
  const [revisionNumber, setRevisionNumber] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") setFile(dropped);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !revisionName.trim()) return;

    setUploading(true);
    setProgress(10);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      setProgress(40);

      const res = await fetch(`/api/drawing-sets/${drawingSetId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64,
          filename: file.name,
          metadata: {
            revisionName: revisionName.trim(),
            revisionNumber: revisionNumber.trim() || undefined,
            description: description.trim() || undefined,
          },
        }),
      });

      setProgress(80);
      const data = (await res.json()) as { version?: DrawingSetVersion; error?: { code?: string; message?: string } };

      if (!res.ok) {
        if (data.error?.code === "DUPLICATE_CHECKSUM") {
          setError("This exact file already exists in this drawing set.");
        } else {
          setError(data.error?.message ?? "Upload failed");
        }
        return;
      }

      setProgress(100);
      if (data.version) onUploaded?.(data.version);
      onClose?.();
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Upload New Revision</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div>
                <div className="font-medium text-sm">{file.name}</div>
                <div className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                Drag a PDF here or click to browse
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Revision Name *</label>
            <input
              type="text"
              value={revisionName}
              onChange={(e) => setRevisionName(e.target.value)}
              placeholder="e.g. Issued for Construction"
              className="border rounded px-3 py-1 text-sm w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Revision Number</label>
            <input
              type="text"
              value={revisionNumber}
              onChange={(e) => setRevisionNumber(e.target.value)}
              placeholder="e.g. Rev 3"
              className="border rounded px-3 py-1 text-sm w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border rounded px-3 py-1 text-sm w-full resize-none"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Uploading…</div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-1 text-sm border rounded hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !revisionName.trim() || uploading}
              className="px-4 py-1 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
