import { describe, expect, it } from 'vitest';
import {
  APPEAL_STATUS,
  isScheduledTimeValid,
  maxScheduledTime,
  scheduledTimeInputBounds,
  scheduledTimeOptions,
  URGENCY,
} from './urgency';

const NOW = new Date('2026-06-30T10:00:00');

describe('maxScheduledTime (FR-007)', () => {
  it('is exactly two hours after the given time', () => {
    expect(maxScheduledTime(NOW).getTime()).toBe(NOW.getTime() + 2 * 60 * 60 * 1000);
  });
});

describe('isScheduledTimeValid (FR-007)', () => {
  it('always passes for Urgent appeals, regardless of scheduledTime', () => {
    expect(isScheduledTimeValid(URGENCY.URGENT, null, NOW)).toBe(true);
    expect(isScheduledTimeValid(URGENCY.URGENT, undefined, NOW)).toBe(true);
  });

  it('rejects a Standard appeal with no scheduledTime', () => {
    expect(isScheduledTimeValid(URGENCY.STANDARD, null, NOW)).toBe(false);
  });

  it('accepts a Standard appeal time within the next two hours', () => {
    const oneHourLater = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
    expect(isScheduledTimeValid(URGENCY.STANDARD, oneHourLater, NOW)).toBe(true);
  });

  it('accepts the exact two-hour boundary', () => {
    const exactlyTwoHours = maxScheduledTime(NOW).toISOString();
    expect(isScheduledTimeValid(URGENCY.STANDARD, exactlyTwoHours, NOW)).toBe(true);
  });

  it('rejects a time more than two hours out', () => {
    const threeHoursLater = new Date(NOW.getTime() + 3 * 60 * 60 * 1000).toISOString();
    expect(isScheduledTimeValid(URGENCY.STANDARD, threeHoursLater, NOW)).toBe(false);
  });

  it('rejects a time in the past', () => {
    const oneHourEarlier = new Date(NOW.getTime() - 60 * 60 * 1000).toISOString();
    expect(isScheduledTimeValid(URGENCY.STANDARD, oneHourEarlier, NOW)).toBe(false);
  });
});

describe('scheduledTimeInputBounds', () => {
  it('returns min equal to now and max two hours later, in local datetime-input format', () => {
    const bounds = scheduledTimeInputBounds(NOW);
    expect(bounds.min).toBe('2026-06-30T10:00');
    expect(bounds.max).toBe('2026-06-30T12:00');
  });
});

describe('scheduledTimeOptions (FR-007)', () => {
  it('generates 15-minute slots from now up to the two-hour boundary, inclusive', () => {
    const options = scheduledTimeOptions(NOW);
    expect(options[0]).toEqual({ value: '2026-06-30T10:00', label: expect.any(String) });
    expect(options.at(-1)).toEqual({ value: '2026-06-30T12:00', label: expect.any(String) });
    expect(options).toHaveLength(9);
  });

  it('rounds the first slot up to the next interval boundary when now is off-grid', () => {
    const offGrid = new Date('2026-06-30T10:07:00');
    const options = scheduledTimeOptions(offGrid);
    expect(options[0].value).toBe('2026-06-30T10:15');
  });

  it('every generated slot is valid per isScheduledTimeValid', () => {
    const options = scheduledTimeOptions(NOW);
    options.forEach((option) => {
      expect(isScheduledTimeValid(URGENCY.STANDARD, option.value, NOW)).toBe(true);
    });
  });

  it('supports a custom interval', () => {
    const options = scheduledTimeOptions(NOW, 30);
    expect(options.map((o) => o.value)).toEqual([
      '2026-06-30T10:00',
      '2026-06-30T10:30',
      '2026-06-30T11:00',
      '2026-06-30T11:30',
      '2026-06-30T12:00',
    ]);
  });
});

describe('URGENCY and APPEAL_STATUS constants', () => {
  it('exposes the expected values', () => {
    expect(URGENCY).toEqual({ URGENT: 'Urgent', STANDARD: 'Standard' });
    expect(APPEAL_STATUS).toEqual({ ACTIVE: 'Active', FULFILLED: 'Fulfilled', CLOSED: 'Closed' });
  });
});
