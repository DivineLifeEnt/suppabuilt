/**
 * PDF export for estimates and flattened plans.
 * Uses pdfkit for document generation.
 *
 * NOTE on flattened plan PDF:
 * Full SVG annotation burn-in requires Sprint 6 rasterization integration.
 * TODO: Integrate with page render artifacts from DrawingPageVersion.renderKey
 *       to embed rasterized pages with markups and measurements overlaid.
 *       Currently produces a manifest-only PDF listing included pages.
 */
import PDFDocument from "pdfkit";
import type { VersionTotals } from "@/server/estimating/calculation-service";
import type { ExportTemplateConfig } from "@/lib/exports/types";
import { formatMoney } from "@/lib/estimating/money";

export async function exportEstimatePdf(
  version: { id: string; versionNumber: number; currency: string; status: string },
  lines: Array<{
    id: string; description: string; category: string; quantity: string; unit: string;
    unitMaterialCost: string; laborHoursPerUnit: string; burdenedLaborRate: string;
    unitEquipmentCost: string; unitSubcontractCost: string; unitOtherCost: string;
    wastePercent: string; notes: string | null; included: boolean;
  }>,
  totals: VersionTotals,
  template: ExportTemplateConfig,
  includeInternal: boolean
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header ──────────────────────────────────────────────────────────────
    if (template.companyName) {
      doc.fontSize(18).font("Helvetica-Bold").text(template.companyName);
      doc.moveDown(0.3);
    }
    if (template.headerText) {
      doc.fontSize(10).font("Helvetica").text(template.headerText);
      doc.moveDown(0.3);
    }
    doc.fontSize(16).font("Helvetica-Bold").text(`Estimate — Version ${version.versionNumber}`);
    doc.fontSize(10).font("Helvetica").text(`Status: ${version.status} | Currency: ${version.currency}`);
    doc.moveDown(1);

    // ── Line items ──────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("Line Items");
    doc.moveDown(0.5);

    const includedLines = lines.filter((l) => l.included);
    for (const line of includedLines) {
      doc.fontSize(9).font("Helvetica-Bold").text(line.description, { continued: true });
      doc.font("Helvetica").text(`  [${line.category}]  qty: ${line.quantity} ${line.unit}`);
      if (includeInternal && template.showUnitCosts) {
        doc.fontSize(8).text(
          `  material: ${line.unitMaterialCost} | labor hrs: ${line.laborHoursPerUnit} | rate: ${line.burdenedLaborRate}`
        );
      }
      if (line.notes && (includeInternal || !template.showInternalNotes)) {
        doc.fontSize(8).fillColor("#555").text(`  ${line.notes}`).fillColor("black");
      }
    }

    doc.moveDown(1);

    // ── Totals ──────────────────────────────────────────────────────────────
    doc.fontSize(12).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.5);

    const col1x = 50;
    const col2x = 350;

    function addTotalRow(label: string, amount: string) {
      doc.fontSize(10).font("Helvetica").text(label, col1x, doc.y, { continued: false });
      doc.text(amount, col2x, doc.y - doc.currentLineHeight());
      doc.moveDown(0.3);
    }

    addTotalRow("Material Cost:", formatMoney(totals.materialCost));
    addTotalRow("Labor Cost:", formatMoney(totals.laborCost));
    addTotalRow("Equipment Cost:", formatMoney(totals.equipmentCost));
    addTotalRow("Subcontract Cost:", formatMoney(totals.subcontractCost));
    addTotalRow("Other Direct Cost:", formatMoney(totals.otherDirectCost));
    doc.moveTo(col1x, doc.y).lineTo(450, doc.y).stroke();
    doc.moveDown(0.2);
    addTotalRow("Total Direct Cost:", formatMoney(totals.totalDirectCost));

    for (const adj of totals.adjustments) {
      addTotalRow(`${adj.label}:`, formatMoney(adj.amount));
    }
    doc.moveTo(col1x, doc.y).lineTo(450, doc.y).stroke();
    doc.moveDown(0.2);
    addTotalRow("Base Total:", formatMoney(totals.baseTotal));

    for (const tax of totals.taxes) {
      addTotalRow(`${tax.label} (tax):`, formatMoney(tax.amount));
    }
    doc.fontSize(12).font("Helvetica-Bold");
    addTotalRow("FINAL TOTAL:", formatMoney(totals.finalTotal));

    // ── Footer ──────────────────────────────────────────────────────────────
    if (template.termsText) {
      doc.moveDown(2);
      doc.fontSize(8).font("Helvetica").fillColor("#666").text("Terms & Conditions:").text(template.termsText).fillColor("black");
    }
    if (template.footerText) {
      doc.moveDown(1);
      doc.fontSize(8).font("Helvetica").fillColor("#888").text(template.footerText).fillColor("black");
    }

    doc.end();
  });
}

/**
 * Simplified flattened plan PDF.
 * TODO: Full implementation requires:
 * 1. Loading each page's renderKey artifact from LocalArtifactStorage
 * 2. Rasterizing SVG markups/measurements onto the page image (Sprint 6 integration)
 * 3. Embedding rendered page images into the PDF
 * Currently produces a manifest-only PDF listing included pages.
 */
export async function exportFlattenedPlanPdf(): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").text("Flattened Plan PDF");
    doc.moveDown(1);
    doc.fontSize(10).font("Helvetica").text(
      "Full SVG annotation burn-in requires Sprint 6 rasterization integration. " +
      "TODO: Load each DrawingPageVersion.renderKey artifact from LocalArtifactStorage, " +
      "overlay markups and measurements, and embed rendered page images."
    );
    doc.moveDown(1);
    doc.text("Manifest: (page content to be embedded in full implementation)");

    doc.end();
  });
}
