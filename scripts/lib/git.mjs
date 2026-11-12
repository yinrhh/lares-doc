import { execFileSync } from 'node:child_process';
import { ROOT } from './paths.mjs';

/** 统一入口：失败时抛出带 stderr 的错误，方便上层给出人话提示。 */
export function git(args, { allowFail = false } = {}) {
	try {
		return execFileSync('git', args, {
			cwd: ROOT,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			maxBuffer: 64 * 1024 * 1024,
		}).trim();
	} catch (error) {
		if (allowFail) return null;
		const stderr = (error.stderr ?? '').toString().trim();
		throw new Error(`git ${args.join(' ')} 执行失败${stderr ? `：${stderr}` : ''}`);
	}
}

export function isRepo() {
	return git(['rev-parse', '--is-inside-work-tree'], { allowFail: true }) === 'true';
}

/** 已配置的远程名，没有则返回 []。 */
export function remotes() {
	const out = git(['remote'], { allowFail: true });
	return out ? out.split('\n').filter(Boolean) : [];
}

function unquote(path) {
	return path.replace(/^"(.*)"$/, '$1');
}

/** 工作区里所有未提交的改动路径（-uall：未跟踪目录展开成具体文件）。 */
export function statusPaths() {
	const out = git(['status', '--porcelain', '-uall'], { allowFail: true });
	if (!out) return [];

	return out
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const path = line.slice(3).trim();
			const renamed = path.indexOf(' -> ');
			return unquote(renamed === -1 ? path : path.slice(renamed + 4));
		});
}

/** 某天以来已提交过的文件路径。 */
export function committedPathsSince(iso) {
	const out = git(['log', `--since=${iso}T00:00:00`, '--name-only', '--pretty=format:'], {
		allowFail: true,
	});
	if (!out) return [];

	return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

/** 当天零点前最后一次提交的 hash，用于统计「今天新增了多少行」。 */
export function lastCommitBefore(iso) {
	const out = git(['log', `--until=${iso}T00:00:00`, '-1', '--format=%H'], { allowFail: true });
	return out || null;
}

export function diffNumstat(baseRef, paths) {
	const out = git(['diff', '--numstat', baseRef, '--', ...paths], { allowFail: true });
	if (out === null) return null;

	let added = 0;
	let removed = 0;
	for (const line of out.split('\n')) {
		if (!line.trim()) continue;
		const [adds, dels] = line.split('\t');
		added += Number(adds) || 0;
		removed += Number(dels) || 0;
	}

	return { added, removed };
}

export function stage(paths) {
	git(['add', '-A', '--', ...paths]);
}

export function hasStagedChanges() {
	return git(['diff', '--cached', '--quiet'], { allowFail: true }) === null;
}

export function commit(subject, body) {
	const args = ['commit', '-m', subject];
	if (body) args.push('-m', body);
	git(args);
}

/** 推送；失败不抛错，交给调用方如实汇报。 */
export function push() {
	const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@u'], {
		allowFail: true,
	});
	const args = upstream ? ['push'] : ['push', '-u', 'origin', 'HEAD'];

	try {
		git(args);
		return { pushed: true, message: '' };
	} catch (error) {
		return { pushed: false, message: error.message };
	}
}

export function headShort() {
	return git(['rev-parse', '--short', 'HEAD'], { allowFail: true }) ?? '';
}
