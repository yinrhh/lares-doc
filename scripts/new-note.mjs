#!/usr/bin/env node
/**
 * 新建一页主题笔记。
 *
 *   node scripts/new-note.mjs "Rust 所有权" --tags rust,memory
 *   node scripts/new-note.mjs "Rust 所有权" --slug rust-ownership
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { hasFlag, parseArgs, stringFlag } from './lib/args.mjs';
import { toISODate } from './lib/date.mjs';
import * as fmt from './lib/format.mjs';
import { NOTES_DIR } from './lib/paths.mjs';
import { renderTemplate } from './lib/template.mjs';

/** 只保留 ASCII，避免 URL 里出现编码字符；中文标题请配合 --slug。 */
function asciiSlug(input) {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function fallbackSlug() {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `note-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function escapeYaml(value) {
	return value.replace(/\r?\n/g, ' ').replace(/'/g, "''");
}

function main() {
	const { flags, positional } = parseArgs();

	if (hasFlag(flags, 'help')) {
		console.log(`
用法: node scripts/new-note.mjs "<标题>" [选项]

  --slug <slug>     文件名（默认由标题生成；中文标题请手动指定）
  --tags a,b,c      标签
  --date <日期>     默认今天
`);
		return;
	}

	const title = (stringFlag(flags, 'title') ?? positional.join(' ')).trim();
	if (!title) {
		fmt.fail('缺少标题。示例：npm run note -- "Rust 所有权" --slug rust-ownership');
		process.exitCode = 1;
		return;
	}

	const slug = stringFlag(flags, 'slug') ?? asciiSlug(title) ?? '';
	const filename = `${slug || fallbackSlug()}.md`;
	const date = stringFlag(flags, 'date') ?? toISODate();
	const tags = (stringFlag(flags, 'tags') ?? '')
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);

	if (existsSync(join(NOTES_DIR, filename))) {
		fmt.fail(`已存在同名笔记：notes/${filename}`);
		process.exitCode = 1;
		return;
	}

	if (!slug) {
		fmt.warn(`标题没有可用的 ASCII 字符，文件名退化为 ${filename}（可用 --slug 自定义）`);
	}

	mkdirSync(NOTES_DIR, { recursive: true });
	writeFileSync(
		join(NOTES_DIR, filename),
		renderTemplate('note.md', {
			title: escapeYaml(title),
			date,
			tags: tags.join(', '),
		}),
		'utf8'
	);

	fmt.ok(`已创建 src/content/docs/notes/${filename}`);
	fmt.info('刷新浏览器即可在「主题笔记」分组看到它。');
}

try {
	main();
} catch (error) {
	fmt.fail(error.message);
	process.exitCode = 1;
}
