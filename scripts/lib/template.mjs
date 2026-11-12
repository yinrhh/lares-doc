import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATES_DIR } from './paths.mjs';

/** 用 `{{key}}` 占位符渲染 templates/ 下的模板。 */
export function renderTemplate(name, vars = {}) {
	const raw = readFileSync(join(TEMPLATES_DIR, name), 'utf8');

	return raw.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key) =>
		Object.hasOwn(vars, key) ? String(vars[key]) : match
	);
}
