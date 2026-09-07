"use client";

import { useState } from "react";
import type { EstimateLine } from "@/lib/estimating/types";

type LineInput = {
  description: string; category: string; quantity: string; unit: string;
  unitMaterialCost: string; laborHoursPerUnit: string; burdenedLaborRate: string;
  unitEquipmentCost: string; unitSubcontractCost: string; unitOtherCost: string;
  wastePercent: string; notes: string; included: boolean;
};

type Props = {
  line?: EstimateLine;
  onSave: (input: LineInput) => void;
  onCancel: () => void;
  currency: string;
};

const CATEGORIES = ["material","labor","equipment","subcontract","freight","consumable","permit","rental","allowance","other"];

export function EstimateLineEditor({ line, onSave, onCancel, currency }: Props) {
  const [form, setForm] = useState<LineInput>({
    description: line?.description ?? "",
    category: line?.category ?? "material",
    quantity: line?.quantity ?? "1",
    unit: line?.unit ?? "each",
    unitMaterialCost: line?.unitMaterialCost ?? "0",
    laborHoursPerUnit: line?.laborHoursPerUnit ?? "0",
    burdenedLaborRate: line?.burdenedLaborRate ?? "0",
    unitEquipmentCost: line?.unitEquipmentCost ?? "0",
    unitSubcontractCost: line?.unitSubcontractCost ?? "0",
    unitOtherCost: line?.unitOtherCost ?? "0",
    wastePercent: line?.wastePercent ?? "0",
    notes: line?.notes ?? "",
    included: line?.included ?? true,
  });

  const set = (key: keyof LineInput, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const labelStyle: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "2px" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #D1D5DB", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box" };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
      <h3 style={{ margin: 0, fontSize: "15px" }}>{line ? "Edit Line" : "New Line"} ({currency})</h3>
      <div>
        <label style={labelStyle}>Description *</label>
        <input style={inputStyle} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quantity</label>
          <input style={inputStyle} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Unit</label>
          <input style={inputStyle} value={form.unit} onChange={(e) => set("unit", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Waste %</label>
          <input style={inputStyle} value={form.wastePercent} onChange={(e) => set("wastePercent", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Unit Material Cost</label>
          <input style={inputStyle} value={form.unitMaterialCost} onChange={(e) => set("unitMaterialCost", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Labor Hrs / Unit</label>
          <input style={inputStyle} value={form.laborHoursPerUnit} onChange={(e) => set("laborHoursPerUnit", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Burdened Labor Rate</label>
          <input style={inputStyle} value={form.burdenedLaborRate} onChange={(e) => set("burdenedLaborRate", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Unit Equipment Cost</label>
          <input style={inputStyle} value={form.unitEquipmentCost} onChange={(e) => set("unitEquipmentCost", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Unit Subcontract Cost</label>
          <input style={inputStyle} value={form.unitSubcontractCost} onChange={(e) => set("unitSubcontractCost", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Unit Other Cost</label>
          <input style={inputStyle} value={form.unitOtherCost} onChange={(e) => set("unitOtherCost", e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <input type="checkbox" id="included" checked={form.included} onChange={(e) => set("included", e.target.checked)} />
        <label htmlFor="included" style={{ fontSize: "13px" }}>Include in totals</label>
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "7px 16px", border: "1px solid #D1D5DB", borderRadius: "6px", cursor: "pointer", background: "#fff" }}>
          Cancel
        </button>
        <button
          onClick={() => { if (form.description.trim()) onSave(form); }}
          style={{ padding: "7px 16px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}
