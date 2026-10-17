import { describe, expect, it } from 'vitest';
import { SEED_DATA } from './seed';

describe('starter data', () => {
  it('contains no personal phone numbers', () => {
    const text = JSON.stringify(SEED_DATA);
    expect(text).not.toMatch(/01[3-9]\d{8}/);
    expect(text).not.toMatch(/01[3-9]-\d{6}/);
  });

  it('marks exactly one coordinator for the safety screen', () => {
    expect(SEED_DATA.members.filter((member) => member.role === 'coordinator')).toHaveLength(1);
  });

  it('starts every expense as paid by the fund', () => {
    expect(SEED_DATA.expenses.every((expense) => expense.paidById === null)).toBe(true);
  });
});
