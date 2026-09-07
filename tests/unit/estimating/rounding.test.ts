import { describe, it, expect } from "vitest";
import { addMoney, roundMoney, zeroMoney } from "@/lib/estimating/money";

describe("rounding precision", () => {
  it("sum of 100 lines of 0.01 equals 1.00 in USD", () => {
    let total = zeroMoney("USD");
    for (let i = 0; i < 100; i++) {
      total = addMoney(total, { amount: "0.01", currency: "USD" });
    }
    const rounded = roundMoney(total);
    expect(parseFloat(rounded.amount)).toBeCloseTo(1.0, 5);
  });

  it("intermediate precision is maintained before final round", () => {
    let total = zeroMoney("USD");
    for (let i = 0; i < 3; i++) {
      total = addMoney(total, { amount: "0.10", currency: "USD" });
    }
    // 0.30 exactly, BigInt arithmetic — no float drift
    expect(parseFloat(total.amount)).toBeCloseTo(0.30, 10);
  });

  it("avoids float drift with 1/3 fractions", () => {
    const third = { amount: "0.3333333333", currency: "USD" };
    let total = zeroMoney("USD");
    for (let i = 0; i < 3; i++) {
      total = addMoney(total, third);
    }
    const rounded = roundMoney(total);
    // 3 * 0.3333333333 = 0.9999999999, rounds to 1.00
    expect(parseFloat(rounded.amount)).toBeCloseTo(1.0, 4);
  });
});
