import { describe, it, expect } from "vitest";
import {
  parseMoney, addMoney, roundMoney, formatMoney, zeroMoney,
} from "@/lib/estimating/money";

describe("parseMoney", () => {
  it("parses integer string", () => {
    const m = parseMoney("100", "USD");
    expect(m.amount).toBe("100");
    expect(m.currency).toBe("USD");
  });

  it("parses decimal string", () => {
    const m = parseMoney("99.99", "USD");
    expect(m.amount).toBe("99.99");
  });

  it("preserves precision", () => {
    expect(parseMoney("1.23456789", "USD").amount).toBe("1.23456789");
  });
});

describe("addMoney", () => {
  it("adds two same-currency amounts", () => {
    const a = { amount: "10.50", currency: "USD" };
    const b = { amount: "4.50", currency: "USD" };
    expect(parseFloat(addMoney(a, b).amount)).toBeCloseTo(15.0, 5);
  });

  it("throws on currency mismatch", () => {
    const a = { amount: "10", currency: "USD" };
    const b = { amount: "10", currency: "CAD" };
    expect(() => addMoney(a, b)).toThrow();
  });
});

describe("roundMoney", () => {
  it("rounds USD to 2 decimal places", () => {
    const m = { amount: "10.005", currency: "USD" };
    // half-up: 10.005 → 10.01
    const rounded = parseFloat(roundMoney(m).amount);
    expect(rounded).toBeCloseTo(10.01, 5);
  });

  it("rounds JPY to 0 decimal places", () => {
    const m = { amount: "100.7", currency: "JPY" };
    expect(parseFloat(roundMoney(m).amount)).toBeCloseTo(101, 0);
  });

  it("handles already-rounded amount", () => {
    const m = { amount: "50.00", currency: "USD" };
    expect(parseFloat(roundMoney(m).amount)).toBeCloseTo(50.0, 5);
  });
});

describe("zeroMoney", () => {
  it("returns zero for currency", () => {
    const z = zeroMoney("USD");
    expect(parseFloat(z.amount)).toBe(0);
    expect(z.currency).toBe("USD");
  });
});

describe("formatMoney", () => {
  it("formats USD with symbol", () => {
    const m = { amount: "12.50", currency: "USD" };
    const s = formatMoney(m);
    expect(s).toContain("12.50");
  });
});
