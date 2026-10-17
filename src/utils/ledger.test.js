import { describe, expect, it } from 'vitest';
import { FUND_LABEL, allocate, categoryTotals, computeLedger, payerIdFor, settle } from './ledger';

const member = (id, deposit, familyCount = 1, name = `সদস্য ${id}`) => ({ id, name, deposit, familyCount });

describe('allocate', () => {
  it('splits a total so the parts add up exactly', () => {
    const parts = allocate(1000, [1, 1, 1]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(1000);
    expect(parts.sort((a, b) => b - a)).toEqual([334, 333, 333]);
  });

  it('is proportional to the weights', () => {
    expect(allocate(900, [2, 1])).toEqual([600, 300]);
  });

  it('handles zero totals and empty or zero weights', () => {
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
    expect(allocate(500, [])).toEqual([]);
    expect(allocate(500, [0, 0])).toEqual([0, 0]);
  });
});

describe('payerIdFor', () => {
  const members = [member(1, 0, 1, 'রাজু ভাই'), member(2, 0, 1, 'মাসুদ ভাই')];

  it('reads the member ID when the entry has one', () => {
    expect(payerIdFor({ paidById: 2 }, members)).toBe(2);
  });

  it('treats an entry with no member as paid by the fund', () => {
    expect(payerIdFor({ paidById: null }, members)).toBeNull();
  });

  it('falls back to an exact name match for older entries', () => {
    expect(payerIdFor({ paidBy: '  মাসুদ ভাই ' }, members)).toBe(2);
    expect(payerIdFor({ paidBy: FUND_LABEL }, members)).toBeNull();
    expect(payerIdFor({ paidBy: 'মাসুদ' }, members)).toBeNull();
  });

  it('does not credit a payment to a member who no longer exists', () => {
    expect(payerIdFor({ paidById: 99 }, members)).toBeNull();
  });
});

describe('computeLedger', () => {
  it('matches the seeded trip: fund balance equals deposits minus fund spending', () => {
    const members = [member(1, 15000, 2), member(2, 15000, 3), member(3, 20000, 4), member(4, 10000, 1)];
    const expenses = [
      { amount: 25000, paidById: null },
      { amount: 48000, paidById: null },
      { amount: 3500, paidById: null },
    ];
    const ledger = computeLedger({ members, expenses });
    expect(ledger.totalDeposits).toBe(60000);
    expect(ledger.fundBalance).toBe(60000 - 76500);
    const netTotal = ledger.rows.reduce((sum, row) => sum + row.net, 0);
    expect(netTotal).toBeCloseTo(ledger.fundBalance, 2);
  });

  it('settles a fund surplus by refunding members from the fund', () => {
    const members = [member(1, 1000), member(2, 1000)];
    const ledger = computeLedger({ members, expenses: [{ amount: 600, paidById: null }] });
    expect(ledger.fundBalance).toBe(1400);
    const refunds = ledger.settlements.filter((payment) => payment.fromFund);
    expect(refunds.reduce((sum, payment) => sum + payment.amount, 0)).toBe(1400);
    expect(ledger.settlements.every((payment) => !payment.toFund)).toBe(true);
  });

  it('credits out-of-pocket payments to the member and keeps the fund correct', () => {
    const members = [member(1, 1000), member(2, 1000)];
    const expenses = [
      { amount: 600, paidById: null },
      { amount: 400, paidById: 1 },
    ];
    const ledger = computeLedger({ members, expenses });
    expect(ledger.fundPaid).toBe(600);
    expect(ledger.fundBalance).toBe(1400);
    const [first, second] = ledger.rows;
    expect(first.share).toBe(500);
    expect(first.net).toBe(900);
    expect(second.net).toBe(500);
    expect(ledger.settlements.reduce((sum, payment) => sum + payment.amount, 0)).toBe(1400);
  });

  it('asks members to top up the fund when spending exceeds deposits', () => {
    const members = [member(1, 500), member(2, 500)];
    const ledger = computeLedger({ members, expenses: [{ amount: 1500, paidById: null }] });
    expect(ledger.fundBalance).toBe(-500);
    expect(ledger.settlements.every((payment) => payment.toFund)).toBe(true);
    expect(ledger.settlements.reduce((sum, payment) => sum + payment.amount, 0)).toBe(500);
  });

  it('weights shares by family size', () => {
    const members = [member(1, 0, 2), member(2, 0, 1)];
    const ledger = computeLedger({ members, expenses: [{ amount: 900, paidById: null }] });
    expect(ledger.rows.map((row) => row.share)).toEqual([600, 300]);
    expect(ledger.perHeadCost).toBe(300);
  });

  it('handles an empty trip', () => {
    const ledger = computeLedger({ members: [], expenses: [] });
    expect(ledger).toMatchObject({ headcount: 0, fundBalance: 0, settlements: [] });
  });

  it('keeps every balance consistent over random trips', () => {
    // Deterministic pseudo-random generator, so failures reproduce.
    let seed = 20261017;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let trip = 0; trip < 200; trip += 1) {
      const count = 1 + Math.floor(next() * 8);
      const members = Array.from({ length: count }, (_, index) =>
        member(index + 1, Math.round(next() * 30000) / 100, 1 + Math.floor(next() * 4)),
      );
      const expenses = Array.from({ length: Math.floor(next() * 12) }, () => {
        const pays = next() < 0.3 ? null : 1 + Math.floor(next() * count);
        return { amount: Math.round(next() * 90000) / 100, paidById: pays };
      });
      const ledger = computeLedger({ members, expenses });

      const sumNets = ledger.rows.reduce((sum, row) => sum + Math.round(row.net * 100), 0);
      expect(sumNets).toBe(Math.round(ledger.fundBalance * 100));

      const balances = new Map([[FUND_LABEL, -sumNets / 100], ...ledger.rows.map((row) => [row.name, row.net])]);
      for (const payment of ledger.settlements) {
        balances.set(payment.from, balances.get(payment.from) + payment.amount);
        balances.set(payment.to, balances.get(payment.to) - payment.amount);
      }
      for (const [name, balance] of balances) {
        expect(Math.abs(balance), `${name} in trip ${trip}`).toBeLessThan(0.005);
      }
    }
  });
});

describe('settle', () => {
  it('pays every debt in as few transfers as the greedy pass allows', () => {
    const payments = settle([
      { name: 'ক', netPaisa: -5000 },
      { name: 'খ', netPaisa: 3000 },
      { name: 'গ', netPaisa: 2000 },
    ]);
    expect(payments).toEqual([
      { from: 'ক', to: 'খ', fromFund: false, toFund: false, amount: 30 },
      { from: 'ক', to: 'গ', fromFund: false, toFund: false, amount: 20 },
    ]);
  });
});

describe('categoryTotals', () => {
  it('sums each category and sorts the largest first', () => {
    const totals = categoryTotals([
      { category: 'খাবার', amount: 300 },
      { category: 'হোটেল', amount: 2000 },
      { category: 'খাবার', amount: 50.5 },
      { amount: 10 },
    ]);
    expect(totals).toEqual([
      { category: 'হোটেল', amount: 2000 },
      { category: 'খাবার', amount: 350.5 },
      { category: 'অন্যান্য', amount: 10 },
    ]);
  });
});
