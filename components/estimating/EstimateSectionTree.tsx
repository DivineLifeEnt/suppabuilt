"use client";

import type { EstimateSection } from "@/lib/estimating/types";

type Props = {
  sections: EstimateSection[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string | null) => void;
  onRename: (id: string) => void;
  activeSection: string | null;
  onSelectSection: (id: string | null) => void;
  isReadOnly: boolean;
};

function SectionNode({
  section, sections, expandedIds, onToggle, onAddChild, onRename,
  activeSection, onSelectSection, isReadOnly, depth,
}: Props & { section: EstimateSection; depth: number }) {
  const children = sections.filter((s) => s.parentId === section.id);
  const isExpanded = expandedIds.has(section.id);
  const isActive = activeSection === section.id;

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          paddingLeft: `${(depth + 1) * 16}px`, paddingTop: "4px", paddingBottom: "4px",
          background: isActive ? "#EFF6FF" : "transparent",
          cursor: "pointer", borderRadius: "4px",
        }}
        onClick={() => onSelectSection(section.id)}
      >
        {children.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(section.id); }}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "10px", color: "#6B7280", padding: "0 2px" }}
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        )}
        <span style={{ fontSize: "13px", flex: 1 }}>{section.name}</span>
        {!isReadOnly && depth < 4 && (
          <button onClick={(e) => { e.stopPropagation(); onAddChild(section.id); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "11px", color: "#2563EB" }} title="Add child section">+</button>
        )}
        {!isReadOnly && (
          <button onClick={(e) => { e.stopPropagation(); onRename(section.id); }} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "11px", color: "#6B7280" }} title="Rename">✎</button>
        )}
      </div>
      {isExpanded && children.map((child) => (
        <SectionNode
          key={child.id} section={child} sections={sections} expandedIds={expandedIds}
          onToggle={onToggle} onAddChild={onAddChild} onRename={onRename}
          activeSection={activeSection} onSelectSection={onSelectSection}
          isReadOnly={isReadOnly} depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function EstimateSectionTree({
  sections, expandedIds, onToggle, onAddChild, onRename,
  activeSection, onSelectSection, isReadOnly,
}: Props) {
  const roots = sections.filter((s) => s.parentId === null);
  return (
    <div style={{ padding: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", paddingLeft: "8px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>SECTIONS</span>
        {!isReadOnly && (
          <button onClick={() => onAddChild(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#2563EB", fontWeight: 600 }}>+</button>
        )}
      </div>
      <div
        onClick={() => onSelectSection(null)}
        style={{ padding: "4px 8px", cursor: "pointer", borderRadius: "4px", fontSize: "13px", color: "#6B7280", background: activeSection === null ? "#EFF6FF" : "transparent" }}
      >
        All Lines
      </div>
      {roots.map((section) => (
        <SectionNode
          key={section.id} section={section} sections={sections} expandedIds={expandedIds}
          onToggle={onToggle} onAddChild={onAddChild} onRename={onRename}
          activeSection={activeSection} onSelectSection={onSelectSection}
          isReadOnly={isReadOnly} depth={0}
        />
      ))}
    </div>
  );
}
