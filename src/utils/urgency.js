export const URGENCY = {
  URGENT: 'Urgent',
  STANDARD: 'Standard',
};

export const APPEAL_STATUS = {
  ACTIVE: 'Active',
  FULFILLED: 'Fulfilled',
  CLOSED: 'Closed',
};

export function maxScheduledTime(fromDate = new Date()) {
  return new Date(fromDate.getTime() + 2 * 60 * 60 * 1000);
}

export function isScheduledTimeValid(urgencyLevel, scheduledTime, now = new Date()) {
  if (urgencyLevel === URGENCY.URGENT) return true;
  if (!scheduledTime) return false;
  const selected = new Date(scheduledTime);
  return selected >= now && selected <= maxScheduledTime(now);
}

function toLocalDateTimeValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function scheduledTimeInputBounds(now = new Date()) {
  return { min: toLocalDateTimeValue(now), max: toLocalDateTimeValue(maxScheduledTime(now)) };
}

export function scheduledTimeOptions(now = new Date(), intervalMinutes = 15) {
  const max = maxScheduledTime(now);
  const first = new Date(now);
  first.setSeconds(0, 0);
  const remainder = first.getMinutes() % intervalMinutes;
  if (remainder !== 0) {
    first.setMinutes(first.getMinutes() + (intervalMinutes - remainder));
  }

  const options = [];
  for (const slot = new Date(first); slot <= max; slot.setMinutes(slot.getMinutes() + intervalMinutes)) {
    options.push({
      value: toLocalDateTimeValue(slot),
      label: slot.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    });
  }
  return options;
}
