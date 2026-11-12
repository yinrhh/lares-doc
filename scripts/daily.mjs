#!/usr/bin/env node
/**
 * 一键归档今天的学习记录。
 *
 *   node scripts/daily.mjs            建笔记 → 写汇总 → 刷索引 → commit → push
 *   node scripts/daily.mjs --status   只看统计，不写文件、不碰 git
 *   node scripts/daily.mjs --no-commit  写文件但不提交
 *   node scripts/daily.mjs --date 2026-02-13  补记某一天
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { hasFlag, parseArgs, stringFlag } from './lib/args.mjs';
import { resolveDateFlag, shortDate, weekdayOf } from './lib/date.mjs';
import * as fmt from './lib/format.mjs';
import * as git from './lib/git.mjs';
import {
	AUTO_END,
	AUTO_START,
	libraryStats,
	noteWordCount,
	renderDailyBlock,
	renderIndex,
} from './lib/library.mjs';
import { DAILY_DIR, ROOT } from './lib/paths.mjs';
import { renderTemplate } from './lib/template.mjs';
import { formatNumber, frontmatterFields, readText, replaceBlock, slugOf } from './lib/text.mjs';

const INDEX_START = '<!-- daily:index:start -->';
const INDEX_END = '<!-- daily:index:end -->';

const CONTENT_ROOT = 'src/content/docs';

function stamp() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** 相对仓库根的路径，输出更短。 */
function rel(path) {
	return relative(ROOT, path);
}

/** 抹掉汇总区块里的生成时间，用于判断「除了时间戳有没有真的变化」。 */
function withoutStamp(text) {
	return text.replace(/^_由 `npm run daily` 于 .*?_$/m, '');
}

function classify(paths) {
	const changes = { daily: [], notes: [], resources: [] };

	for (const path of paths) {
		if (path.startsWith(`${CONTENT_ROOT}/daily/`)) changes.daily.push(path);
		else if (path.startsWith(`${CONTENT_ROOT}/notes/`)) changes.notes.push(path);
		else if (path.startsWith(`${CONTENT_ROOT}/resources/`)) changes.resources.push(path);
	}

	return changes;
}

function relatedNotesOf(changes) {
	return changes.notes
		.filter((path) => /\.mdx?$/i.test(path) && !/\/index\.mdx?$/i.test(path))
		.map((path) => {
			const filename = path.split('/').pop();
			const raw = readText(join(ROOT, path));
			return {
				slug: slugOf(filename),
				title: frontmatterFields(raw).title || slugOf(filename),
			};
		});
}

function ensureIndexPage() {
	const indexPath = join(DAILY_DIR, 'index.md');
	if (existsSync(indexPath)) return readText(indexPath);

	const seed = `---
title: 每日学习索引
description: 每一天的学习记录，按时间倒序
---

这里按时间倒序列出每一天的记录。

${INDEX_START}

${INDEX_END}
`;

	mkdirSync(DAILY_DIR, { recursive: true });
	writeFileSync(indexPath, seed, 'utf8');
	return seed;
}

function printHelp() {
	console.log(`
用法: node scripts/daily.mjs [选项]

  --date <YYYY-MM-DD>  指定日期，默认今天（补记某天用）
  --status             只输出统计，不写文件、不提交
  --no-commit          生成并更新索引，但不执行 git 提交
  --help               显示这段帮助
`);
}

function main() {
	const { flags } = parseArgs();

	if (hasFlag(flags, 'help')) {
		printHelp();
		return;
	}

	const iso = resolveDateFlag(stringFlag(flags, 'date'));
	const statusOnly = hasFlag(flags, 'status') || hasFlag(flags, 'dry-run');
	const skipGit = statusOnly || hasFlag(flags, 'no-commit') || hasFlag(flags, 'no-git');

	fmt.heading(`📅 ${iso} ${weekdayOf(iso)}`);

	const inRepo = git.isRepo();
	if (!inRepo) {
		fmt.warn('当前目录不是 git 仓库，改动统计与提交都会被跳过');
	}

	// ── 1. 建今天的笔记 ─────────────────────────────────────
	const notePath = join(DAILY_DIR, `${iso}.md`);
	const noteExisted = existsSync(notePath);

	if (!noteExisted) {
		if (statusOnly) {
			fmt.warn(`今天还没有笔记（${notePath}）`);
		} else {
			mkdirSync(DAILY_DIR, { recursive: true });
			writeFileSync(
				notePath,
				renderTemplate('daily.md', {
					date: iso,
					weekday: weekdayOf(iso),
					shortDate: shortDate(iso),
				}),
				'utf8'
			);
		}
	}

	// ── 2. 统计今天的改动 ───────────────────────────────────
	const touched = inRepo
		? [...new Set([...git.statusPaths(), ...git.committedPathsSince(iso)])].filter((path) =>
				/\.mdx?$/i.test(path)
			)
		: [];

	const changes = classify(touched);
	const relatedNotes = relatedNotesOf(changes);
	const diff = inRepo ? (() => {
		const base = git.lastCommitBefore(iso);
		return base ? git.diffNumstat(base, [CONTENT_ROOT]) : null;
	})() : null;

	const stats = libraryStats(iso);
	const noteWords = existsSync(notePath) ? noteWordCount(readText(notePath)) : 0;

	// ── 3. 写回汇总与索引 ───────────────────────────────────
	if (!statusOnly) {
		if (existsSync(notePath)) {
			const raw = readText(notePath);
			const block = renderDailyBlock({
				noteWords,
				changes,
				diff,
				stats,
				relatedNotes,
				generatedAt: stamp(),
			});
			const updated = replaceBlock(raw, AUTO_START, AUTO_END, block);

			if (updated === null) {
				fmt.warn('笔记里缺少 daily:auto 标记，跳过今日汇总（可从 templates/daily.md 找回）');
			} else if (withoutStamp(updated) === withoutStamp(raw)) {
				// 只有生成时间不同：不重写，免得平白多出一个 commit
				fmt.info('今日汇总无变化，略过');
			} else {
				writeFileSync(notePath, updated, 'utf8');
				fmt.ok(noteExisted ? '已更新今日汇总' : `已新建 ${rel(notePath)} 并写入汇总`);
			}
		}

		const indexRaw = ensureIndexPage();
		const indexNext = replaceBlock(indexRaw, INDEX_START, INDEX_END, renderIndex({ stats, today: iso }));

		if (indexNext === null) {
			fmt.warn('每日索引缺少 daily:index 标记，跳过索引更新');
		} else if (indexNext !== indexRaw) {
			writeFileSync(join(DAILY_DIR, 'index.md'), indexNext, 'utf8');
			fmt.ok('已更新每日索引');
		}
	}

	// ── 4. 提交与推送 ───────────────────────────────────────
	if (!skipGit) {
		if (!inRepo) {
			fmt.warn('跳过提交：不是 git 仓库');
		} else {
			git.stage([CONTENT_ROOT]);

			if (!git.hasStagedChanges()) {
				fmt.info('内容没有变化，跳过提交');
			} else {
				const parts = [
					['每日', changes.daily.length],
					['主题', changes.notes.length],
					['资源', changes.resources.length],
				]
					.filter(([, count]) => count > 0)
					.map(([label, count]) => `${label} ${count}`);

				const subject = `docs(daily): ${iso} 学习记录`;
				const body = [
					`今日笔记 ${formatNumber(noteWords)} 字，累计 ${formatNumber(stats.entryCount)} 篇，连续 ${stats.streak} 天。`,
					parts.length > 0 ? `改动：${parts.join('、')}` : '',
				]
					.filter(Boolean)
					.join('\n');

				try {
					git.commit(subject, body);
					fmt.ok(`已提交 ${git.headShort()}`);
				} catch (error) {
					fmt.fail(error.message);
					process.exitCode = 1;
					return;
				}

				if (git.remotes().length === 0) {
					fmt.warn('还没有配置远程仓库，已跳过推送（git remote add origin <url>）');
				} else {
					const result = git.push();
					if (result.pushed) fmt.ok('已推送到 origin');
					else {
						fmt.fail(`推送失败（本地提交已在，但没推上去）：${result.message}`);
						process.exitCode = 1;
					}
				}
			}
		}
	}

	// ── 5. 收尾报告 ─────────────────────────────────────────
	fmt.blank();
	fmt.info(
		`今日 ${formatNumber(noteWords)} 字 · 累计 ${formatNumber(stats.entryCount)} 篇 · 连续 ${stats.streak} 天 · 全库 ${formatNumber(stats.totalWords)} 字`
	);

	if (!noteExisted && !statusOnly) {
		fmt.info(`打开写今天的内容：${rel(notePath)}`);
	}
	if (skipGit && !statusOnly) {
		fmt.info('本次未提交。确认后运行 git add -A && git commit 即可。');
	}
}

try {
	main();
} catch (error) {
	fmt.fail(error.message);
	process.exitCode = 1;
}
