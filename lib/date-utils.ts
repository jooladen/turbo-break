/** Date → "YYYY-MM-DD" (로컬 타임존 기준, toISOString의 UTC 밀림 방지) */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
