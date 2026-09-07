export type { ExportType, ExportJobStatus, ExportJob } from "@/lib/estimating/types";

export type ExportTemplateConfig = {
  showLogo: boolean;
  showUnitCosts: boolean;
  showLaborRates: boolean;
  showMargins: boolean;
  showInternalNotes: boolean;
  headerText: string | null;
  footerText: string | null;
  companyName: string | null;
  companyAddress: string | null;
  termsText: string | null;
};

export const DEFAULT_EXPORT_TEMPLATE_CONFIG: ExportTemplateConfig = {
  showLogo: false,
  showUnitCosts: true,
  showLaborRates: true,
  showMargins: true,
  showInternalNotes: true,
  headerText: null,
  footerText: null,
  companyName: null,
  companyAddress: null,
  termsText: null,
};

export type ExportJobInput = {
  projectId: string;
  organizationId: string;
  exportType: string;
  sourceIds: string[];
  templateId: string | null;
  idempotencyKey: string;
  versionId: string | null;
  includeInternal: boolean;
};
