import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { buildSidebar } from './src/sidebar.mjs';

// ─────────────────────────────────────────────────────────────
// ⚙️ 首次使用请修改这三项
//
//   GITHUB_USER 你的 GitHub 用户名
//   GITHUB_REPO 仓库名
//   PROJECT_PAGES  仓库名不是 <user>.github.io 时为 true
//                  （即部署到 https://<user>.github.io/<repo>/）
// ─────────────────────────────────────────────────────────────
const GITHUB_USER = 'yinrhh';
const GITHUB_REPO = 'lares-doc';
const PROJECT_PAGES = true;

const BASE = PROJECT_PAGES ? `/${GITHUB_REPO}/` : '/';
const REPO_URL = `https://github.com/${GITHUB_USER}/${GITHUB_REPO}`;

export default defineConfig({
	site: `https://${GITHUB_USER}.github.io`,
	base: BASE,
	integrations: [
		starlight({
			title: '学习笔记',
			description: '每日学习记录 · 主题笔记 · 优质学习资源',
			defaultLocale: 'root',
			locales: {
				root: { label: '简体中文', lang: 'zh-CN' },
			},
			favicon: '/favicon.svg',
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			editLink: { baseUrl: `${REPO_URL}/edit/main/` },
			lastUpdated: true,
			customCss: ['./src/styles/custom.css'],
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			sidebar: buildSidebar(),
		}),
	],
});
