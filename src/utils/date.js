// Calendar dates in the device's own time zone. `toISOString()` is UTC, which puts
// entries made just after midnight in Bangladesh (UTC+6) on the previous day.
const pad = (value) => String(value).padStart(2, '0');

export function localISODate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function localTimeHHMM(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
