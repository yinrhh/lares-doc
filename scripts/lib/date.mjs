/** 日期工具：一律按本地时区，避免 UTC 跨天导致笔记跑到前一天。 */

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const pad = (n) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD'（本地时区） */
export function toISODate(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 'YYYY-MM-DD' → Date（本地零点） */
export function parseISO(iso) {
	const [year, month, day] = iso.split('-').map(Number);
	return new Date(year, month - 1, day);
}

export function isValidISO(iso) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
	const date = parseISO(iso);
	return toISODate(date) === iso;
}

export function weekdayOf(iso) {
	return WEEKDAY_CN[parseISO(iso).getDay()];
}

/** '2026-02-14' → '02-14' */
export function shortDate(iso) {
	return iso.slice(5);
}

/** 两个 ISO 日期的整日差（a - b）。 */
export function dayDiff(a, b) {
	return Math.round((parseISO(a) - parseISO(b)) / 86_400_000);
}

export function addDays(iso, days) {
	const date = parseISO(iso);
	date.setDate(date.getDate() + days);
	return toISODate(date);
}

/** 解析 --date 之类的参数，默认今天。 */
export function resolveDateFlag(value) {
	if (!value) return toISODate();
	if (!isValidISO(value)) throw new Error(`日期格式不对：${value}（应形如 2026-02-14）`);
	return value;
}
