/**
 * 侧边栏生成器。
 *
 * 「每日学习」按月份自动分组（新月份在上、月内在新日期在上），
 * 「主题笔记」「学习资源」走 Starlight 的 autogenerate，目录即导航。
 *
 * 新增每日笔记不需要改这里，`npm run daily` 会自动建文件，构建时自动出现。
 */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'content', 'docs');
const DAILY_DIR = join(CONTENT_DIR, 'daily');

/** `YYYY-MM-DD.md` / `YYYY-MM-DD.mdx` */
const DATE_FILE = /^(\d{4})-(\d{2})-(\d{2})\.mdx?$/;
const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 站内链接一律用相对路径，这样换部署地址（base）也不会断。 */
export const WEEKDAY_NAMES = WEEKDAY_CN;

/** 读取所有每日笔记，按日期倒序。 */
export function dailyEntries() {
	if (!existsSync(DAILY_DIR)) return [];

	const entries = [];
	for (const name of readdirSync(DAILY_DIR)) {
		const match = DATE_FILE.exec(name);
		if (!match) continue;
		const [, year, month, day] = match;
		const iso = `${year}-${month}-${day}`;
		entries.push({
			iso,
			year,
			month,
			day,
			weekday: weekdayOf(iso),
		});
	}

	return entries.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
}

function weekdayOf(iso) {
	return WEEKDAY_CN[new Date(`${iso}T00:00:00`).getDay()];
}

function currentMonthKey() {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 按月份把每日笔记聚合成侧边栏分组。 */
function monthGroups(entries) {
	const months = new Map();

	for (const entry of entries) {
		const key = `${entry.year}-${entry.month}`;
		if (!months.has(key)) months.set(key, { year: entry.year, month: entry.month, items: [] });
		months.get(key).items.push(entry);
	}

	const active = currentMonthKey();

	return [...months.keys()]
		.sort()
		.reverse()
		.map((key) => {
			const { year, month, items } = months.get(key);
			return {
				label: `${year} 年 ${Number(month)} 月`,
				// 只有当月默认展开，历史月份收起，避免侧边栏无限变长
				collapsed: key !== active,
				badge: { text: String(items.length), variant: 'default' },
				items: items.map((entry) => ({
					label: `${entry.month}-${entry.day} ${entry.weekday}`,
					link: `/daily/${entry.iso}/`,
				})),
			};
		});
}

export function buildSidebar() {
	const entries = dailyEntries();

	return [
		{
			label: '开始',
			items: [
				{ label: '首页', link: '/' },
				{ label: '这个库怎么用', link: '/about/' },
			],
		},
		{
			label: '每日学习',
			items: [{ label: '每日索引', link: '/daily/' }, ...monthGroups(entries)],
		},
		{
			label: '主题笔记',
			items: [
				{ label: '笔记目录', link: '/notes/' },
				{ autogenerate: { directory: 'notes' } },
			],
		},
		{
			label: '学习资源',
			items: [
				{ label: '资源总览', link: '/resources/' },
				{ autogenerate: { directory: 'resources' } },
			],
		},
	];
}
