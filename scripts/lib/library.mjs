import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DAILY_DIR, NOTES_DIR, RESOURCES_DIR } from './paths.mjs';
import { addDays, toISODate, weekdayOf } from './date.mjs';
import { countWords, formatNumber, frontmatterFields, readText } from './text.mjs';

const DATE_NOTE = /^(\d{4}-\d{2}-\d{2})\.mdx?$/;
const MARKDOWN = /\.mdx?$/i;
const INDEX_FILE = /^index\.mdx?$/i;

export const AUTO_START = '<!-- daily:auto:start -->';
export const AUTO_END = '<!-- daily:auto:end -->';

/** 笔记正文字数：不计自动汇总区块，否则它会把自己算进去。 */
export function noteWordCount(raw) {
	const cut = raw.indexOf(AUTO_START);
	return countWords(cut === -1 ? raw : raw.slice(0, cut));
}

/** 目录下的 Markdown 文件（忽略 `_` 前缀的草稿）。 */
export function listMarkdown(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).filter((name) => MARKDOWN.test(name) && !name.startsWith('_'));
}

/** 所有每日笔记，按日期倒序。 */
export function listDailyEntries() {
	return listMarkdown(DAILY_DIR)
		.map((name) => ({ name, match: DATE_NOTE.exec(name) }))
		.filter((item) => item.match !== null)
		.map(({ name, match }) => {
			const iso = match[1];
			const raw = readText(join(DAILY_DIR, name));
			const title = frontmatterFields(raw).title;
			return { iso, file: name, words: noteWordCount(raw), title: title || iso };
		})
		.sort((a, b) => (a.iso < b.iso ? 1 : a.iso > b.iso ? -1 : 0));
}

function wordsIn(dir) {
	return listMarkdown(dir)
		.filter((name) => !INDEX_FILE.test(name))
		.reduce((sum, name) => sum + countWords(readText(join(dir, name))), 0);
}

/** 从今天（或昨天）往回数的连续记录天数。 */
export function currentStreak(entries, today = toISODate()) {
	const days = new Set(entries.map((entry) => entry.iso));
	let cursor = days.has(today) ? today : addDays(today, -1);
	if (!days.has(cursor)) return 0;

	let streak = 0;
	while (days.has(cursor)) {
		streak += 1;
		cursor = addDays(cursor, -1);
	}
	return streak;
}

export function libraryStats(today = toISODate()) {
	const entries = listDailyEntries();
	const monthKey = today.slice(0, 7);

	return {
		entries,
		entryCount: entries.length,
		streak: currentStreak(entries, today),
		monthCount: entries.filter((entry) => entry.iso.startsWith(monthKey)).length,
		totalWords:
			entries.reduce((sum, entry) => sum + entry.words, 0) +
			wordsIn(NOTES_DIR) +
			wordsIn(RESOURCES_DIR),
	};
}

/** 相对路径：从 daily/<iso>/ 指到 notes/<slug>/。 */
function noteLink(note) {
	return `[${note.title}](../../notes/${note.slug}/)`;
}

function changeSummary(changes) {
	const parts = [
		['每日', changes.daily.length],
		['主题', changes.notes.length],
		['资源', changes.resources.length],
	].filter(([, count]) => count > 0);

	if (parts.length === 0) return '今天还没有改动';

	const total = parts.reduce((sum, [, count]) => sum + count, 0);
	const detail = parts.map(([label, count]) => `${label} ${count}`).join(' · ');
	return `${total} 个文件（${detail}）`;
}

/** 每日笔记末尾的「今日汇总」区块。 */
export function renderDailyBlock({ noteWords, changes, diff, stats, relatedNotes, generatedAt }) {
	const lines = ['## 📊 今日汇总', ''];

	lines.push(`- **今日笔记**：${formatNumber(noteWords)} 字`);
	lines.push(`- **今日改动**：${changeSummary(changes)}`);

	if (diff && (diff.added > 0 || diff.removed > 0)) {
		lines.push(`- **行数变化**：+${formatNumber(diff.added)} / -${formatNumber(diff.removed)}`);
	}

	lines.push(
		`- **累计**：${formatNumber(stats.entryCount)} 篇记录 · 连续 ${stats.streak} 天 · 全库 ${formatNumber(stats.totalWords)} 字`
	);

	if (relatedNotes.length > 0) {
		lines.push(`- **今天动到的主题笔记**：${relatedNotes.map(noteLink).join('、')}`);
	}

	lines.push('');
	lines.push(`_由 \`npm run daily\` 于 ${generatedAt} 生成，请勿手改本区块。_`);

	return lines.join('\n');
}

/** 每日索引页（daily/index.md）的自动区块。 */
export function renderIndex({ stats, today, recentCount = 14 }) {
	if (stats.entryCount === 0) {
		return '_还没有记录。运行 `npm run daily` 生成今天的第一篇。_';
	}

	const recent = stats.entries.slice(0, recentCount);

	const monthCounts = new Map();
	for (const entry of stats.entries) {
		const key = entry.iso.slice(0, 7);
		monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
	}

	const lines = [
		'### 打卡统计',
		'',
		'| 指标 | 数值 |',
		'| --- | --- |',
		`| 记录篇数 | ${formatNumber(stats.entryCount)} |`,
		`| 连续打卡 | ${stats.streak} 天 |`,
		`| 本月记录 | ${stats.monthCount} 天 |`,
		`| 全库字数 | ${formatNumber(stats.totalWords)} |`,
		'',
		`### 最近 ${recent.length} 篇`,
		'',
		'| 日期 | 星期 | 字数 | 记录 |',
		'| --- | --- | --- | --- |',
		...recent.map(
			(entry) =>
				`| ${entry.iso} | ${weekdayOf(entry.iso)} | ${formatNumber(entry.words)} | [查看](./${entry.iso}/) |`
		),
		'',
		'### 按月归档',
		'',
		'| 月份 | 篇数 |',
		'| --- | --- |',
		...[...monthCounts.entries()].map(([key, count]) => {
			const [year, month] = key.split('-');
			return `| ${year} 年 ${month} 月 | ${count} |`;
		}),
	];

	return lines.join('\n');
}
