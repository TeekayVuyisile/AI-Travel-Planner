import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeBalances, evenShares, settleUp } from '../services/settlementService.js';

const sumCents = (shares) => shares.reduce((sum, s) => sum + s.cents, 0);

describe('evenShares', () => {
  it('adds up exactly to the total, giving leftover cents to the first people', () => {
    const shares = evenShares(10000, [1, 2, 3]);
    assert.deepEqual(shares.map(s => s.cents), [3334, 3333, 3333]);
    assert.equal(sumCents(shares), 10000);
  });

  it('handles totals smaller than the number of people', () => {
    const shares = evenShares(2, [1, 2, 3]);
    assert.deepEqual(shares.map(s => s.cents), [1, 1, 0]);
  });
});

describe('computeBalances', () => {
  it('credits the payer and debits each share', () => {
    const balances = computeBalances([1, 2, 3], [
      { paid_by: 1, amount_trip: '90.00', splits: [{ user_id: 1, share: 30 }, { user_id: 2, share: 30 }, { user_id: 3, share: 30 }] }
    ]);
    assert.deepEqual(Object.fromEntries(balances), { 1: 6000, 2: -3000, 3: -3000 });
  });

  it('always sums to zero across the group', () => {
    const expenses = [
      { paid_by: 1, amount_trip: 100, splits: [{ user_id: 1, share: 33.34 }, { user_id: 2, share: 33.33 }, { user_id: 3, share: 33.33 }] },
      { paid_by: 2, amount_trip: 45.5, splits: [{ user_id: 2, share: 20 }, { user_id: 3, share: 25.5 }] },
      { paid_by: 3, amount_trip: 12, splits: [{ user_id: 1, share: 12 }] }
    ];
    const total = [...computeBalances([1, 2, 3], expenses).values()].reduce((a, b) => a + b, 0);
    assert.equal(total, 0);
  });

  it('keeps people who left the group in the balances', () => {
    const balances = computeBalances([1], [{ paid_by: 9, amount_trip: 10, splits: [{ user_id: 1, share: 10 }] }]);
    assert.equal(balances.get(9), 1000);
    assert.equal(balances.get(1), -1000);
  });
});

describe('settleUp', () => {
  it('returns no transfers when everyone is square', () => {
    assert.deepEqual(settleUp(new Map([[1, 0], [2, 0]])), []);
  });

  it('clears every balance with at most n - 1 transfers', () => {
    const balances = new Map([[1, 5000], [2, -2000], [3, -2500], [4, 1500], [5, -2000]]);
    const transfers = settleUp(new Map(balances));
    assert.ok(transfers.length <= balances.size - 1);

    for (const t of transfers) {
      balances.set(t.from, balances.get(t.from) + Math.round(t.amount * 100));
      balances.set(t.to, balances.get(t.to) - Math.round(t.amount * 100));
    }
    assert.ok([...balances.values()].every(cents => cents === 0));
  });

  it('pays the biggest creditor first', () => {
    const [first] = settleUp(new Map([[1, 300], [2, 700], [3, -1000]]));
    assert.deepEqual(first, { from: 3, to: 2, amount: 7 });
  });
});
