import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import currencyService from '../services/currencyService.js';
import aiService from '../services/aiService.js';

describe('currencyService fallback rates', () => {
  it('converts between two non-ZAR currencies through ZAR', () => {
    const eurToUsd = currencyService.getMockConversion(100, 'EUR', 'USD');
    // 0.054 / 0.049 per the fallback table
    assert.equal(eurToUsd.exchange_rate, 1.102);
    assert.equal(eurToUsd.converted_amount, 110.2);
  });

  it('uses a rate of 1 for the same currency', () => {
    assert.equal(currencyService.getMockConversion(50, 'ZAR', 'ZAR').converted_amount, 50);
  });
});

describe('aiService.sanitizeItems', () => {
  const center = { lat: -33.9249, lng: 18.4241 }; // Cape Town

  it('keeps coordinates near the destination and drops far-away ones', () => {
    const [near, far] = aiService.sanitizeItems([
      { title: 'Table Mountain', lat: -33.9628, lng: 18.4098 },
      { title: 'Wrong city', lat: -26.2041, lng: 28.0473 } // Johannesburg, ~1,260 km away
    ], { center });
    assert.deepEqual([near.lat, near.lng], [-33.9628, 18.4098]);
    assert.deepEqual([far.lat, far.lng], [null, null]);
  });

  it('rejects invalid times, unknown categories and negative costs', () => {
    const [item] = aiService.sanitizeItems([
      { title: 'Lunch', start_time: '25:00', category: 'gambling', est_cost: -40, slot: 'brunch' }
    ], { center });
    assert.equal(item.start_time, null);
    assert.equal(item.category, null);
    assert.equal(item.est_cost, 0);
    assert.equal(item.slot, null);
  });

  it('drops items without a title and caps a day at six items', () => {
    const items = aiService.sanitizeItems(
      [{ title: '' }, ...Array.from({ length: 8 }, (_, i) => ({ title: `Stop ${i}` }))],
      { center }
    );
    assert.equal(items.length, 6);
    assert.equal(items[0].title, 'Stop 0');
  });

  it('prefers the coordinates of a matching candidate place', () => {
    const [item] = aiService.sanitizeItems(
      [{ title: 'Museum', place_xid: 'N1', lat: 0, lng: 0 }],
      { center, places: [{ id: 'N1', location: { lat: -33.92, lon: 18.42 } }] }
    );
    assert.deepEqual([item.lat, item.lng, item.place_xid], [-33.92, 18.42, 'N1']);
  });
});
