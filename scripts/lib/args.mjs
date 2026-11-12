/** 极简参数解析：`--key value`、`--flag`、位置参数。 */

export function parseArgs(argv = process.argv.slice(2)) {
	const flags = {};
	const positional = [];

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];

		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}

		const [rawKey, inlineValue] = arg.slice(2).split('=');
		const key = rawKey.trim();

		if (inlineValue !== undefined) {
			flags[key] = inlineValue;
			continue;
		}

		const next = argv[i + 1];
		if (next !== undefined && !next.startsWith('--')) {
			flags[key] = next;
			i += 1;
		} else {
			flags[key] = true;
		}
	}

	return { flags, positional };
}

/** 取字符串参数；纯 flag（值为 true）时返回 fallback。 */
export function stringFlag(flags, key, fallback = undefined) {
	const value = flags[key];
	if (value === undefined) return fallback;
	if (value === true) return fallback;
	return String(value);
}

export function hasFlag(flags, key) {
	return flags[key] !== undefined && flags[key] !== false;
}
