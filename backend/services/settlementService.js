// Group expense maths. Everything is done in integer cents to avoid floating point drift.

const toCents = (value) => Math.round(Number(value) * 100);

// Splits `totalCents` evenly between `userIds`; the leftover cents go to the first people in the list,
// so the shares always add up exactly to the total.
export const evenShares = (totalCents, userIds) => {
  const base = Math.floor(totalCents / userIds.length);
  const remainder = totalCents - base * userIds.length;
  return userIds.map((userId, i) => ({ user_id: userId, cents: base + (i < remainder ? 1 : 0) }));
};

// Net position per member: positive means the group owes them, negative means they owe the group.
// `expenses` rows carry paid_by, amount_trip and splits [{ user_id, share }].
export const computeBalances = (memberIds, expenses) => {
  const balances = new Map(memberIds.map(id => [id, 0]));
  const add = (id, cents) => balances.set(id, (balances.get(id) ?? 0) + cents);

  for (const expense of expenses) {
    if (expense.paid_by != null) add(expense.paid_by, toCents(expense.amount_trip));
    for (const split of expense.splits) add(split.user_id, -toCents(split.share));
  }
  return balances;
};

// Turns balances into a short list of payments that squares everyone up: repeatedly match the person
// owed the most with the person who owes the most. This settles n people in at most n - 1 transfers.
export const settleUp = (balances) => {
  const creditors = [];
  const debtors = [];
  for (const [userId, cents] of balances) {
    if (cents > 0) creditors.push({ userId, cents });
    else if (cents < 0) debtors.push({ userId, cents: -cents });
  }

  const transfers = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.cents - a.cents);
    debtors.sort((a, b) => b.cents - a.cents);
    const creditor = creditors[0];
    const debtor = debtors[0];
    const cents = Math.min(creditor.cents, debtor.cents);

    transfers.push({ from: debtor.userId, to: creditor.userId, amount: cents / 100 });
    creditor.cents -= cents;
    debtor.cents -= cents;
    if (creditor.cents === 0) creditors.shift();
    if (debtor.cents === 0) debtors.shift();
  }
  return transfers;
};

export const centsToAmount = (cents) => cents / 100;
