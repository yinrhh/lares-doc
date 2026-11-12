import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = join(ROOT, 'src', 'content', 'docs');
export const DAILY_DIR = join(CONTENT_DIR, 'daily');
export const NOTES_DIR = join(CONTENT_DIR, 'notes');
export const RESOURCES_DIR = join(CONTENT_DIR, 'resources');
export const TEMPLATES_DIR = join(ROOT, 'templates');

/** 内容库的三个板块，顺序即汇报顺序。 */
export const SECTIONS = [
	{ key: 'daily', dir: DAILY_DIR, prefix: 'src/content/docs/daily/', label: '每日' },
	{ key: 'notes', dir: NOTES_DIR, prefix: 'src/content/docs/notes/', label: '主题' },
	{ key: 'resources', dir: RESOURCES_DIR, prefix: 'src/content/docs/resources/', label: '资源' },
];
