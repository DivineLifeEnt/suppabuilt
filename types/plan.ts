export type PlanRecord = {
  id: string;
  name: string;
  size: number;
  mimeType: "application/pdf";
  createdAt: string;
  url: string;
};

export type PageInfo = {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
};

export type FitMode = "custom" | "width" | "page";
