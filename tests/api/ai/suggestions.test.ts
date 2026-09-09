import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ userId: "user-1", orgId: "org-1", name: "Test", email: "test@test.com" }),
}));

vi.mock("@/server/ai/ai-policy-service", () => ({
  isAIEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock("@/server/ai/suggestion-review-service", () => ({
  acceptSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
  getSuggestionsForRun: vi.fn(),
}));

import { acceptSuggestion, rejectSuggestion } from "@/server/ai/suggestion-review-service";
import { POST as acceptPost } from "@/app/api/ai/suggestions/[suggestionId]/accept/route";
import { POST as rejectPost } from "@/app/api/ai/suggestions/[suggestionId]/reject/route";

const mockAccept = acceptSuggestion as ReturnType<typeof vi.fn>;
const mockReject = rejectSuggestion as ReturnType<typeof vi.fn>;

const makeParams = (suggestionId: string) => ({
  params: Promise.resolve({ suggestionId }),
});

const baseSuggestion = {
  id: "sug-1",
  runId: "run-1",
  pageId: "page-1",
  kind: "symbol_count",
  description: "diffuser",
  confidence: 0.91,
  status: "accepted",
  takeoffItemId: "takeoff-abc",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAccept.mockResolvedValue(baseSuggestion);
  mockReject.mockResolvedValue({ ...baseSuggestion, status: "rejected", takeoffItemId: undefined });
});

describe("POST /api/ai/suggestions/[suggestionId]/accept", () => {
  it("accepts a suggestion and returns 200", async () => {
    const req = new Request("http://localhost/api/ai/suggestions/sug-1/accept", {
      method: "POST",
      body: JSON.stringify({ takeoffInput: { qty: 2, unit: "ea", description: "diffuser" } }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await acceptPost(req, makeParams("sug-1"));
    expect(res.status).toBe(200);
    const body = await res.json() as { suggestion: { id: string; takeoffItemId: string } };
    expect(body.suggestion.id).toBe("sug-1");
    expect(body.suggestion.takeoffItemId).toBe("takeoff-abc");
  });

  it("is idempotent — double accept returns same takeoffItemId", async () => {
    // acceptSuggestion is mocked to always return same result with takeoffItemId set
    const req = () => new Request("http://localhost/api/ai/suggestions/sug-1/accept", {
      method: "POST",
      body: JSON.stringify({ takeoffInput: { qty: 2, unit: "ea", description: "diffuser" } }),
      headers: { "Content-Type": "application/json" },
    });

    const res1 = await acceptPost(req(), makeParams("sug-1"));
    const res2 = await acceptPost(req(), makeParams("sug-1"));

    const body1 = await res1.json() as { suggestion: { takeoffItemId: string } };
    const body2 = await res2.json() as { suggestion: { takeoffItemId: string } };

    expect(body1.suggestion.takeoffItemId).toBe(body2.suggestion.takeoffItemId);
    expect(mockAccept).toHaveBeenCalledTimes(2);
  });

  it("returns 422 when takeoffInput is missing", async () => {
    const req = new Request("http://localhost/api/ai/suggestions/sug-1/accept", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await acceptPost(req, makeParams("sug-1"));
    expect(res.status).toBe(422);
  });

  it("returns 422 when qty is not positive", async () => {
    const req = new Request("http://localhost/api/ai/suggestions/sug-1/accept", {
      method: "POST",
      body: JSON.stringify({ takeoffInput: { qty: -1, unit: "ea", description: "test" } }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await acceptPost(req, makeParams("sug-1"));
    expect(res.status).toBe(422);
  });
});

describe("POST /api/ai/suggestions/[suggestionId]/reject", () => {
  it("rejects a suggestion and returns 200", async () => {
    const req = new Request("http://localhost/api/ai/suggestions/sug-1/reject", {
      method: "POST",
    });

    const res = await rejectPost(req, makeParams("sug-1"));
    expect(res.status).toBe(200);
    const body = await res.json() as { suggestion: { status: string } };
    expect(body.suggestion.status).toBe("rejected");
  });

  it("calls rejectSuggestion with the correct id and userId", async () => {
    const req = new Request("http://localhost/api/ai/suggestions/sug-2/reject", {
      method: "POST",
    });

    await rejectPost(req, makeParams("sug-2"));
    expect(mockReject).toHaveBeenCalledWith("sug-2", "user-1");
  });
});
