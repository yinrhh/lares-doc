#!/usr/bin/env node
/**
 * 往资源表里加一条记录。
 *
 *   node scripts/new-resource.mjs --category books --title "深入理解计算机系统" \
 *     --url https://csapp.cs.cmu.edu/ --type 教材 --status 在学 --rating 5 --note "打地基"
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { hasFlag, parseArgs, stringFlag } from './lib/args.mjs';
import * as fmt from './lib/format.mjs';
import { RESOURCES_DIR } from './lib/paths.mjs';

const CATEGORIES = {
	courses: '课程与讲座',
	books: '书籍',
	articles: '文章与博客',
	tools: '工具与文档',
};

function splitRow(line) {
	const trimmed = line.trim();
	if (!trimmed.startsWith('|')) return [];
	return trimmed
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());
}

function escapeCell(value) {
	return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

function ratingCell(value) {
	const count = Number(value);
	if (!Number.isFinite(count) || count <= 0) return '—';
	return '⭐'.repeat(Math.min(5, Math.round(count)));
}

/** 在「资源」表头的分隔行之后插入一行（最新在上）。 */
function insertRow(raw, row) {
	const lines = raw.split('\n');
	const headerIndex = lines.findIndex((line) => splitRow(line)[0] === '资源');
	if (headerIndex === -1) return null;

	const separator = lines[headerIndex + 1];
	if (!separator || !/^\|[\s:|-]+\|$/.test(separator.trim())) return null;

	lines.splice(headerIndex + 2, 0, row);
	return lines.join('\n');
}

function printUsage() {
	console.log(`
用法: node scripts/new-resource.mjs --category <分类> --title "<名称>" [选项]

分类: ${Object.entries(CATEGORIES)
		.map(([key, label]) => `${key}（${label}）`)
		.join('、')}

  --url <链接>      资源地址
  --type <类型>     教材 / 公开课 / 文章 / 文档 / 工具…
  --status <状态>   想学 / 在学 / 学完 / 常用 / 搁置（默认 想学）
  --rating <1-5>    评分
  --note <评价>     一句话评价
  --dry-run         只打印将要写入的行
`);
}

function main() {
	const { flags } = parseArgs();

	if (hasFlag(flags, 'help')) {
		printUsage();
		return;
	}

	const category = stringFlag(flags, 'category');
	const title = stringFlag(flags, 'title');

	if (!category || !Object.hasOwn(CATEGORIES, category)) {
		fmt.fail(`--category 必须是：${Object.keys(CATEGORIES).join(' / ')}`);
		printUsage();
		process.exitCode = 1;
		return;
	}

	if (!title) {
		fmt.fail('缺少 --title');
		process.exitCode = 1;
		return;
	}

	const url = stringFlag(flags, 'url') ?? '';
	const name = url ? `[${title}](${url})` : title;

	const row = [
		`| ${escapeCell(name)}`,
		escapeCell(stringFlag(flags, 'type') ?? '—'),
		escapeCell(stringFlag(flags, 'status') ?? '想学'),
		ratingCell(stringFlag(flags, 'rating')),
		`${escapeCell(stringFlag(flags, 'note') ?? '—')} |`,
	].join(' | ');

	const target = join(RESOURCES_DIR, `${category}.md`);

	if (!existsSync(target)) {
		fmt.fail(`找不到资源页：src/content/docs/resources/${category}.md`);
		process.exitCode = 1;
		return;
	}

	if (hasFlag(flags, 'dry-run')) {
		fmt.info('将要插入这一行：');
		console.log(row);
		return;
	}

	const raw = readFileSync(target, 'utf8');
	const updated = insertRow(raw, row);

	if (updated === null) {
		fmt.fail(`在 resources/${category}.md 里找不到以「资源」开头的表格`);
		process.exitCode = 1;
		return;
	}

	writeFileSync(target, updated, 'utf8');
	fmt.ok(`已加入「${CATEGORIES[category]}」：${title}`);
	fmt.info('记得补上评分和一句话评价——那才是这行记录的真正价值。');
}

try {
	main();
} catch (error) {
	fmt.fail(error.message);
	process.exitCode = 1;
}
