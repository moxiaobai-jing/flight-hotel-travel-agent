import assert from 'node:assert/strict';
import test from 'node:test';

import { createTravelFlow, handleTravelTurn } from './travel-flow.mjs';

test('酒店补齐日期和人数后直接查询，不再要求二次确认', async () => {
  const calls = [];
  const flow = createTravelFlow({
    flightSearch: async () => ({ status: 'available' }),
    hotelSearch: async (query) => {
      calls.push(query);
      return { status: 'available', hotel: { hotelName: query.hotelName }, roomTypes: [] };
    },
  });

  const firstTurn = await handleTravelTurn(flow, {
    sessionId: 'hotel-follow-up',
    input: '帮我查扎斯戈酒店',
    extracted: {
      resource: 'hotel',
      hotelName: '扎斯戈酒店',
      missingFields: ['checkIn', 'checkOut'],
    },
  });
  assert.equal(firstTurn.state, 'missing_required_fields');
  assert.equal(calls.length, 0);

  const secondTurn = await handleTravelTurn(flow, {
    sessionId: 'hotel-follow-up',
    session: firstTurn.session,
    input: '9月21日到9月23日，我们是2个人，1间房',
    extracted: {
      resource: 'hotel',
      hotelName: '扎斯戈酒店',
      checkIn: '2026-09-21',
      checkOut: '2026-09-23',
      adults: 2,
      rooms: 1,
      missingFields: [],
    },
  });

  assert.equal(secondTurn.state, 'same_option_available');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    hotelName: '扎斯戈酒店',
    checkIn: '2026-09-21',
    checkOut: '2026-09-23',
    adults: 2,
    rooms: 1,
    scope: 'same_option',
  });
});

test('机票条件完整时仍保留原有确认闸门', async () => {
  let called = false;
  const flow = createTravelFlow({
    flightSearch: async () => {
      called = true;
      return { status: 'available', candidates: [] };
    },
    hotelSearch: async () => ({ status: 'available' }),
  });

  const result = await handleTravelTurn(flow, {
    sessionId: 'flight-confirmation',
    input: '查上海到成都的航班',
    extracted: {
      resource: 'flight',
      origin: '上海',
      destination: '成都',
      date: '2026-09-21',
      departureTime: '09:00',
      arrivalTime: '12:00',
      missingFields: [],
    },
  });

  assert.equal(result.state, 'awaiting_confirmation');
  assert.equal(called, false);
});

test('抵达时间已由时长推算后，不再重复追问抵达时间', async () => {
  let called = false;
  const flow = createTravelFlow({
    flightSearch: async () => {
      called = true;
      return { status: 'available', candidates: [] };
    },
    hotelSearch: async () => ({ status: 'available' }),
  });

  const result = await handleTravelTurn(flow, {
    sessionId: 'flight-inferred-arrival-time',
    input: '朱安达 T2',
    extracted: {
      resource: 'flight',
      origin: '朱安达 T2',
      date: '2026-10-04',
      departureTime: '13:30',
      arrivalTime: '00:30',
      arrivalTimeInferred: true,
      duration: '11:00',
      missingFields: ['arrivalTime', 'destination'],
    },
  });

  assert.equal(result.state, 'missing_required_fields');
  assert.match(result.reply, /目的地/);
  assert.doesNotMatch(result.reply, /抵达时间/);
  assert.equal(called, false);
});

test('用户在目标酒店有房后主动要求附近酒店会触发 nearby 查询', async () => {
  const calls = [];
  const flow = createTravelFlow({
    flightSearch: async () => ({ status: 'available' }),
    hotelSearch: async (query) => {
      calls.push(query);
      return query.scope === 'nearby'
        ? { status: 'available', rooms: [], alternatives: [{ hotel_name: '附近酒店', distance_meters: 600, price: 238, detail_url: 'https://example.test/nearby' }] }
        : { status: 'available', rooms: [{ name: '大床房', price: 416 }] };
    },
  });

  const firstTurn = await handleTravelTurn(flow, {
    sessionId: 'hotel-nearby-after-available',
    session: { resource: 'hotel', state: 'same_option_available', conditions: {
      hotelName: '目标酒店', checkIn: '2026-09-27', checkOut: '2026-09-29', adults: 2, rooms: 1,
    } },
    input: '附近还有价格不超过500元的优质酒店吗',
    extracted: { resource: 'hotel' },
  });

  assert.equal(firstTurn.state, 'alternative_available');
  assert.deepEqual(calls[0], {
    hotelName: '目标酒店',
    checkIn: '2026-09-27',
    checkOut: '2026-09-29',
    adults: 2,
    rooms: 1,
    scope: 'nearby',
  });
});

test('航班精确核验未命中时先停住，不自动查询替代范围', async () => {
  const calls = [];
  const flow = createTravelFlow({
    flightSearch: async (query) => {
      calls.push(query);
      return { status: 'exact-not-found' };
    },
    hotelSearch: async () => ({ status: 'available' }),
  });

  const firstTurn = await handleTravelTurn(flow, {
    sessionId: 'flight-exact-miss',
    session: {
      resource: 'flight',
      state: 'awaiting_confirmation',
      conditions: {
        origin: '上海浦东T2',
        destination: '登巴萨',
        date: '2026-09-25',
        departureTime: '02:20',
        arrivalTime: '16:25',
      },
    },
    input: '确认',
    userConfirmation: true,
  });

  assert.equal(firstTurn.state, 'same_option_unavailable');
  assert.match(firstTurn.reply, /精确航班|前后三小时|当天任意时段/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].scope, undefined);
  assert.equal(calls[0].alternative_scope, undefined);

  const noConsentTurn = await handleTravelTurn(flow, {
    sessionId: 'flight-exact-miss',
    session: firstTurn.session,
    input: '那你看看吧',
    extracted: { resource: 'flight' },
  });
  assert.equal(noConsentTurn.state, 'same_option_unavailable');
  assert.equal(calls.length, 1);

  const authorizedTurn = await handleTravelTurn(flow, {
    sessionId: 'flight-exact-miss',
    session: noConsentTurn.session,
    input: '前后三小时，价格优先，可以查',
    extracted: { resource: 'flight' },
  });
  assert.equal(authorizedTurn.state, 'alternative_search_requested');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].alternative_scope, 'plus_minus_3_hours');
});
