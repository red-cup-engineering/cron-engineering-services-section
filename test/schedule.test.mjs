import assert from "node:assert/strict";
import test from "node:test";
import { cronRuleOf, isScheduledAt, latestScheduledAtOrBefore, nextScheduledAfter, scheduledInstantsBetween } from "../src/schedule.mjs";

const iso = (ms) => (ms === undefined ? undefined : new Date(ms).toISOString());

test("a weekday morning in Chicago keeps its wall hour across daylight saving", () => {
  const rule = cronRuleOf("30 9 * * 1-5");
  // Friday 2026-10-30 is CDT (UTC-5); Monday 2026-11-02 is CST (UTC-6).
  assert.equal(iso(nextScheduledAfter(rule, "America/Chicago", "2026-10-30T12:00:00Z")), "2026-10-30T14:30:00.000Z");
  assert.equal(iso(nextScheduledAfter(rule, "America/Chicago", "2026-10-30T15:00:00Z")), "2026-11-02T15:30:00.000Z");
  assert.equal(iso(latestScheduledAtOrBefore(rule, "America/Chicago", "2026-11-01T12:00:00Z")), "2026-10-30T14:30:00.000Z");
});

test("a skipped wall time does not occur and a repeated one occurs once", () => {
  // 2027-03-14 02:30 does not exist in Chicago; 2026-11-01 01:30 happens twice.
  assert.equal(iso(nextScheduledAfter("30 2 14 3 *", "America/Chicago", "2027-03-13T00:00:00Z")), "2028-03-14T07:30:00.000Z");
  assert.equal(iso(nextScheduledAfter("30 1 1 11 *", "America/Chicago", "2026-11-01T00:00:00Z")), "2026-11-01T06:30:00.000Z");
  assert.equal(iso(nextScheduledAfter("30 1 1 11 *", "America/Chicago", "2026-11-01T06:30:00Z")), "2027-11-01T06:30:00.000Z");
});

test("day of month and day of week both restricted match when either does", () => {
  const rule = cronRuleOf("0 0 13 * FRI");
  assert.equal(iso(nextScheduledAfter(rule, "UTC", "2026-10-03T00:00:00Z")), "2026-10-09T00:00:00.000Z");
  assert.equal(iso(nextScheduledAfter(rule, "UTC", "2026-10-09T00:00:00Z")), "2026-10-13T00:00:00.000Z");
});

test("steps, names, nicknames and refusals", () => {
  assert.deepEqual([...cronRuleOf("*/20 * * * *").minutes].sort((a, b) => a - b), [0, 20, 40]);
  assert.equal(iso(nextScheduledAfter("@daily", "UTC", "2026-10-03T00:00:00Z")), "2026-10-04T00:00:00.000Z");
  assert.ok(isScheduledAt("0 4 * * *", "UTC", "2026-10-04T04:00:00Z"));
  assert.ok(!isScheduledAt("0 4 * * *", "UTC", "2026-10-04T04:00:30Z"));
  assert.equal(nextScheduledAfter("0 0 30 2 *", "UTC", "2026-01-01T00:00:00Z"), undefined);
  assert.throws(() => cronRuleOf("61 * * * *"), RangeError);
  assert.throws(() => cronRuleOf("* * * *"), TypeError);
  assert.throws(() => cronRuleOf("TZ=UTC 0 0 * * *"), TypeError);
  assert.throws(() => nextScheduledAfter("@daily", "Mars/Olympus", 0), RangeError);
});


test("missed Monday research opportunities preserve Chicago wall hour across DST", () => {
  const result = scheduledInstantsBetween("0 9 * * MON", "America/Chicago",
    "2026-10-20T00:00:00Z", "2026-11-03T00:00:00Z");
  assert.deepEqual(result.instants.map(iso), ["2026-10-26T14:00:00.000Z", "2026-11-02T15:00:00.000Z"]);
  assert.equal(result.hasMore, false);
  assert.equal(result.continuationAfter, null);
  assert.ok(Object.isFrozen(result.instants));
});

test("restartable bounded pages neither drop nor duplicate due instants", () => {
  const start = "2026-10-26T14:00:00Z", end = "2026-10-26T14:04:00Z";
  const one = scheduledInstantsBetween("* * * * *", "UTC", start, end, { limit: 2 });
  assert.deepEqual(one.instants.map(iso), ["2026-10-26T14:01:00.000Z", "2026-10-26T14:02:00.000Z"]);
  assert.equal(one.hasMore, true);
  assert.equal(iso(one.continuationAfter), "2026-10-26T14:02:00.000Z");
  const two = scheduledInstantsBetween("* * * * *", "UTC", one.continuationAfter, end, { limit: 2 });
  assert.deepEqual(two.instants.map(iso), ["2026-10-26T14:03:00.000Z", "2026-10-26T14:04:00.000Z"]);
  assert.equal(two.hasMore, false);
  assert.equal(two.continuationAfter, null);
  assert.deepEqual(scheduledInstantsBetween("* * * * *", "UTC", start, end, { limit: 2 }), one);
});

test("fall-back repeat occurs once and impossible cron produces no fabricated work", () => {
  const once = scheduledInstantsBetween("30 1 1 11 *", "America/Chicago",
    "2026-10-31T00:00:00Z", "2026-11-02T00:00:00Z");
  assert.deepEqual(once.instants.map(iso), ["2026-11-01T06:30:00.000Z"]);
  assert.deepEqual(
    scheduledInstantsBetween("0 0 30 2 *", "UTC", "2026-01-01T00:00:00Z", "2027-01-01T00:00:00Z"),
    { instants: [], hasMore: false, continuationAfter: null });
});

test("occurrence query refuses malformed dates, unsupported zones and unbounded paging", () => {
  const read = (start, end, opts) => scheduledInstantsBetween("0 9 * * 1", "UTC", start, end, opts);
  assert.throws(() => read("not-time", "2026-10-27T00:00:00Z"), TypeError);
  assert.throws(() => read("2026-10-27T00:00:00Z", "2026-10-26T00:00:00Z"), RangeError);
  assert.throws(() => read("2026-10-27T00:00:00Z", "2033-01-01T00:00:00Z"), RangeError);
  for (const limit of [0, 1.5, 257, Infinity]) {
    assert.throws(() => read("2026-10-26T00:00:00Z", "2026-10-27T00:00:00Z", { limit }), RangeError);
  }
  assert.throws(() => scheduledInstantsBetween("0 9 * * 1", "Invalid/Mars", 0, 60_000), RangeError);
});
