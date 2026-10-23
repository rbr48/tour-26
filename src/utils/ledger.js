// Money for the trip, computed in whole paisa so rounding never creates or loses taka.
//
// Model: every member deposits into one shared fund. Expenses are either paid from the
// fund (payer = none) or paid by a member out of pocket (payer = that member). Each
// person's fair share is their headcount's part of the total spend. A member's balance is
// what they put in (deposit + out-of-pocket payments) minus their share. The fund is
// treated as one more party, so the settlements always balance: money that is left over
// flows back from the fund to members, and any shortfall flows from members to the fund.

export const FUND_LABEL = 'ট্যুর ফান্ড';
export const MAX_SAFE_AMOUNT_TAKA = 10_000_000;

export const toPaisa = (taka) => {
  const num = Number(taka || 0);
  if (!Number.isFinite(num) || isNaN(num)) return 0;
  const clamped = Math.max(0, Math.min(MAX_SAFE_AMOUNT_TAKA, num));
  return Math.round(clamped * 100);
};

export const toTaka = (paisa) => paisa / 100;

/**
 * Splits `total` into whole parts proportional to `weights`. The parts always add up to
 * exactly `total`; leftover paisa go to the largest fractions, earliest first.
 */
export function allocate(total, weights) {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  if (weightSum <= 0 || total === 0) return weights.map(() => 0);

  const exact = weights.map((weight) => (total * weight) / weightSum);
  const parts = exact.map((value) => Math.floor(value));
  let leftover = total - parts.reduce((sum, part) => sum + part, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; leftover > 0 && i < order.length; i += 1, leftover -= 1) {
    parts[order[i].index] += 1;
  }
  return parts;
}

/**
 * Which member paid an expense, or null when the fund paid it. Entries store the member
 * ID; older entries stored the name, which is matched exactly once so a rename cannot
 * silently move a payment.
 */
export function payerIdFor(expense, members = []) {
  if ('paidById' in expense) {
    if (expense.paidById === null || expense.paidById === undefined || expense.paidById === '') {
      return null;
    }
    const targetStr = String(expense.paidById);
    const match = (members || []).find((member) => String(member.id) === targetStr);
    return match ? match.id : null;
  }
  const name = String(expense.paidBy ?? '').trim();
  const match = (members || []).find((member) => String(member.name ?? '').trim() === name);
  return match ? match.id : null;
}

export function settle(parties) {
  for (const party of parties) {
    if (!Number.isFinite(party.netPaisa)) {
      throw new Error(`Invalid non-finite net balance for party "${party.name}": ${party.netPaisa}`);
    }
  }

  const balanceSum = parties.reduce((sum, party) => sum + party.netPaisa, 0);
  if (Math.abs(balanceSum) > 1) {
    throw new Error(`Ledger balances do not sum to zero: total net is ${balanceSum} paisa`);
  }

  const debtors = parties
    .filter((party) => party.netPaisa < 0)
    .map((party) => ({ ...party, owesPaisa: -party.netPaisa }))
    .sort((a, b) => b.owesPaisa - a.owesPaisa);
  const creditors = parties
    .filter((party) => party.netPaisa > 0)
    .map((party) => ({ ...party, isOwedPaisa: party.netPaisa }))
    .sort((a, b) => b.isOwedPaisa - a.isOwedPaisa);

  const payments = [];
  let d = 0;
  let c = 0;
  const maxIterations = (debtors.length + creditors.length) * 2;
  let iterations = 0;

  while (d < debtors.length && c < creditors.length && iterations < maxIterations) {
    iterations += 1;
    const amount = Math.min(debtors[d].owesPaisa, creditors[c].isOwedPaisa);
    if (amount <= 0) break;
    payments.push({
      from: debtors[d].name,
      to: creditors[c].name,
      fromFund: debtors[d].fund === true,
      toFund: creditors[c].fund === true,
      amount: toTaka(amount),
    });
    debtors[d].owesPaisa -= amount;
    creditors[c].isOwedPaisa -= amount;
    if (debtors[d].owesPaisa === 0) d += 1;
    if (creditors[c].isOwedPaisa === 0) c += 1;
  }

  const remainingDebtor = debtors.find((debtor) => debtor.owesPaisa > 0);
  const remainingCreditor = creditors.find((creditor) => creditor.isOwedPaisa > 0);
  if (remainingDebtor || remainingCreditor) {
    throw new Error('Settlement could not fully clear balances');
  }

  return payments;
}

/** Full picture for the dashboard, the settlement view and the printable report. */
export function computeLedger({ members = [], expenses = [] }) {
  const weights = members.map((member) => Math.max(1, Number(member.familyCount) || 1));
  const headcount = weights.reduce((sum, weight) => sum + weight, 0);

  let expensePaisa = 0;
  let fundPaidPaisa = 0;
  const directPaisa = new Map(members.map((member) => [member.id, 0]));
  for (const expense of expenses) {
    const paisa = toPaisa(expense.amount);
    expensePaisa += paisa;
    const payer = payerIdFor(expense, members);
    if (payer === null) {
      fundPaidPaisa += paisa;
    } else {
      directPaisa.set(payer, directPaisa.get(payer) + paisa);
    }
  }

  const shares = allocate(expensePaisa, weights);
  const depositsPaisa = members.map((member) => toPaisa(member.deposit));
  const rows = members.map((member, index) => {
    const direct = directPaisa.get(member.id);
    const contributed = depositsPaisa[index] + direct;
    const netPaisa = contributed - shares[index];
    return {
      id: member.id,
      name: member.name,
      familyCount: weights[index],
      deposit: toTaka(depositsPaisa[index]),
      directPaid: toTaka(direct),
      contributed: toTaka(contributed),
      share: toTaka(shares[index]),
      net: toTaka(netPaisa),
      netPaisa,
    };
  });

  const totalDepositsPaisa = depositsPaisa.reduce((sum, paisa) => sum + paisa, 0);
  const fundBalancePaisa = totalDepositsPaisa - fundPaidPaisa;
  const netSumPaisa = rows.reduce((sum, row) => sum + row.netPaisa, 0);

  const parties = [
    ...rows.map((row) => ({ name: row.name, netPaisa: row.netPaisa })),
    { name: FUND_LABEL, netPaisa: -netSumPaisa, fund: true },
  ];

  return {
    headcount,
    totalDeposits: toTaka(totalDepositsPaisa),
    totalExpense: toTaka(expensePaisa),
    fundPaid: toTaka(fundPaidPaisa),
    fundBalance: toTaka(fundBalancePaisa),
    perHeadCost: headcount > 0 ? toTaka(Math.round(expensePaisa / headcount)) : 0,
    rows,
    settlements: settle(parties),
  };
}

/** Totals per category, largest first, for the report. */
export function categoryTotals(expenses) {
  const totals = new Map();
  for (const expense of expenses) {
    const category = expense.category || 'অন্যান্য';
    totals.set(category, (totals.get(category) ?? 0) + toPaisa(expense.amount));
  }
  return [...totals.entries()]
    .map(([category, paisa]) => ({ category, amount: toTaka(paisa) }))
    .sort((a, b) => b.amount - a.amount);
}
