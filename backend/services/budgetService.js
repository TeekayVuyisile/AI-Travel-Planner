import ItineraryItem from '../models/ItineraryItem.js';
import Expense from '../models/Expense.js';
import TripMember from '../models/TripMember.js';
import currencyService from './currencyService.js';
import { computeBalances, settleUp } from './settlementService.js';
import { toISODate, tripDayCount } from '../utils/dates.js';

export const EXPENSE_CATEGORIES = ['accommodation', 'food', 'transport', 'activities', 'shopping', 'other'];

const round2 = (value) => Math.round(value * 100) / 100;

class BudgetService {
  // Rate to convert `from` into `to`. Fallback rates are flagged so the UI can say the amount is an estimate.
  async exchangeRate(from, to) {
    if (from === to) return { rate: 1, estimated: false };
    const conversion = await currencyService.convertCurrency(1, from, to);
    return { rate: Number(conversion.exchange_rate), estimated: conversion.source !== 'exchangerate-api' };
  }

  // Budget overview: planned vs spent, breakdowns for charts, balances and the settle-up transfers
  async summary(trip) {
    const [items, expenses, members] = await Promise.all([
      ItineraryItem.findByTripId(trip.id, null),
      Expense.findByTripId(trip.id),
      TripMember.findByTripId(trip.id)
    ]);

    const days = tripDayCount(trip);
    const start = new Date(`${toISODate(trip.start_date)}T00:00:00Z`);
    const today = new Date(`${toISODate(new Date())}T00:00:00Z`);
    const daysElapsed = Math.min(days, Math.max(0, Math.round((today - start) / 86400000) + 1));

    const plannedPerPerson = items.reduce((sum, item) => sum + Number(item.est_cost || 0), 0);
    const spent = expenses.reduce((sum, e) => sum + Number(e.amount_trip), 0);

    const byCategory = EXPENSE_CATEGORIES
      .map(category => ({
        category,
        amount: round2(expenses.filter(e => e.category === category).reduce((sum, e) => sum + Number(e.amount_trip), 0))
      }))
      .filter(c => c.amount > 0);

    const byDate = new Map();
    for (const e of expenses) {
      const date = toISODate(e.spent_at);
      byDate.set(date, (byDate.get(date) ?? 0) + Number(e.amount_trip));
    }
    const byDay = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount: round2(amount) }));

    const memberIds = members.map(m => m.id);
    const balances = computeBalances(memberIds, expenses);
    const paid = new Map(memberIds.map(id => [id, 0]));
    for (const e of expenses) if (e.paid_by != null) paid.set(e.paid_by, (paid.get(e.paid_by) ?? 0) + Number(e.amount_trip));

    // People who paid or shared costs but have since left the trip still appear in balances
    const people = new Map(members.map(m => [m.id, m]));
    const describe = (id) => {
      const m = people.get(id);
      return m ? { id, first_name: m.first_name, last_name: m.last_name, avatar_color: m.avatar_color } : { id, first_name: 'Former member', last_name: '', avatar_color: '#94a3b8' };
    };

    return {
      currency: trip.currency,
      total_budget: Number(trip.total_budget),
      days,
      days_elapsed: daysElapsed,
      planned_per_person: round2(plannedPerPerson),
      planned_total: round2(plannedPerPerson * trip.travelers_count),
      spent: round2(spent),
      remaining: round2(Number(trip.total_budget) - spent),
      by_category: byCategory,
      by_day: byDay,
      balances: [...balances.entries()].map(([id, cents]) => ({
        ...describe(id),
        paid: round2(paid.get(id) ?? 0),
        net: cents / 100
      })),
      settlements: settleUp(balances).map(t => ({ from: describe(t.from), to: describe(t.to), amount: t.amount }))
    };
  }

  // Rule-based advice when the AI is unavailable
  fallbackAdvice(summary) {
    const share = summary.total_budget ? summary.spent / summary.total_budget : 0;
    const timeShare = summary.days_elapsed / summary.days;
    const money = (n) => `${Math.round(n).toLocaleString('en-ZA')} ${summary.currency}`;
    const top = [...summary.by_category].sort((a, b) => b.amount - a.amount)[0];

    const headline = summary.spent === 0
      ? `Nothing logged yet. The group has ${money(summary.total_budget)} to work with.`
      : `The group has spent ${money(summary.spent)} of ${money(summary.total_budget)} (${Math.round(share * 100)}%), leaving ${money(summary.remaining)}.`;

    const tips = [];
    if (timeShare > 0 && share > timeShare + 0.1) tips.push('Spending is running ahead of the calendar. Consider a lower-cost day to catch up.');
    if (top) tips.push(`${top.category[0].toUpperCase()}${top.category.slice(1)} is the biggest cost so far at ${money(top.amount)}.`);
    if (summary.planned_total > summary.remaining) tips.push(`The remaining planned activities cost about ${money(summary.planned_total)}, more than what is left.`);
    tips.push('Log shared costs as they happen so the settle-up stays accurate.');
    return { headline, tips: tips.slice(0, 4) };
  }
}

export default new BudgetService();
