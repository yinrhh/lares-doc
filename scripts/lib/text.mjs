import { existsSync, readFileSync } from 'node:fs';

export function readText(path) {
	return readFileSync(path, 'utf8');
}

export function exists(path) {
	return existsSync(path);
}

/** 把内容拆成 frontmatter（含分隔符）与正文。 */
export function splitFrontmatter(raw) {
	const normalized = raw.replace(/\r\n/g, '\n');
	if (!normalized.startsWith('---\n')) return { frontmatter: '', body: normalized };

	const end = normalized.indexOf('\n---\n', 3);
	if (end === -1) return { frontmatter: '', body: normalized };

	return {
		frontmatter: normalized.slice(0, end + 5),
		body: normalized.slice(end + 5),
	};
}

/** 读 frontmatter 里的标量字段（够用即可，不引 yaml 依赖）。 */
export function frontmatterFields(raw) {
	const { frontmatter } = splitFrontmatter(raw);
	const fields = {};

	for (const line of frontmatter.split('\n')) {
		const match = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
		if (!match) continue;
		const [, key, value] = match;
		fields[key] = value.trim().replace(/^['"]|['"]$/g, '');
	}

	return fields;
}

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/g;
const LATIN = /[A-Za-z0-9][A-Za-z0-9'’._-]*/g;

/** 去掉不参与计数的部分：frontmatter、HTML 注释、标题行、任务框、链接里的网址。 */
function countBody(body) {
	return body
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/^#{1,6}\s+.*$/gm, ' ')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/https?:\/\/\S+/g, ' ');
}

/**
 * 中英混排字数：中文按字算，英文/数字按词算。
 * 这是「我写了多少字」的粗估，不需要精确到词法分析。
 */
export function countWords(raw) {
	const { body } = splitFrontmatter(raw);
	const text = countBody(body);
	const cjk = (text.match(CJK) || []).length;
	const words = (text.match(LATIN) || []).length;
	return cjk + words;
}

export function formatNumber(value) {
	return value.toLocaleString('en-US');
}

/**
 * 替换两个标记之间的内容。
 * 标记缺失时返回 null —— 让调用方决定是报错还是补标记。
 */
export function replaceBlock(raw, startMarker, endMarker, content) {
	const start = raw.indexOf(startMarker);
	const end = raw.indexOf(endMarker);

	if (start === -1 || end === -1 || end < start) return null;

	const before = raw.slice(0, start + startMarker.length);
	const after = raw.slice(end);

	return `${before}\n\n${content.trim()}\n\n${after}`;
}

/** 文件名 → slug（去掉扩展名）。 */
export function slugOf(filename) {
	return filename.replace(/\.mdx?$/, '');
}
