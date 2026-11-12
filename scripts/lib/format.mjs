/** 终端输出：有 TTY 才上色，CI / 重定向时保持纯文本。 */

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

const wrap = (code) => (text) => (useColor ? `\u001b[${code}m${text}\u001b[0m` : String(text));

export const bold = wrap('1');
export const dim = wrap('2');
export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const cyan = wrap('36');

export const icon = {
	ok: green('✓'),
	warn: yellow('!'),
	fail: red('✗'),
	dot: dim('·'),
	arrow: dim('→'),
};

export function step(message) {
	console.log(`${icon.arrow} ${message}`);
}

export function ok(message) {
	console.log(`${icon.ok} ${message}`);
}

export function warn(message) {
	console.log(`${icon.warn} ${yellow(message)}`);
}

export function fail(message) {
	console.error(`${icon.fail} ${red(message)}`);
}

export function heading(message) {
	console.log(`\n${bold(message)}`);
}

export function info(message) {
	console.log(`${icon.dot} ${dim(message)}`);
}

export function blank() {
	console.log('');
}
