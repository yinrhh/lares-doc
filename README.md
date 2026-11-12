# lares-doc · 个人学习笔记库

每日学习记录 + 主题笔记 + 优质学习资源，用 Markdown 写、用 Git 存、用 Astro Starlight 发布成站。

一条命令完成每天的归档：

```bash
npm run daily
```

建今天的笔记 → 统计今日改动 → 刷新索引与打卡 → `commit` → `push`。

---

## 快速开始

```bash
npm install
npm run dev        # http://localhost:4321/lares-doc/
```

仓库已关联 `https://github.com/yinrhh/lares-doc`（私有），
`astro.config.mjs` 里的 `GITHUB_USER` / `GITHUB_REPO` 已配好，开箱可用。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 本地预览，改 Markdown 立即热更新 |
| `npm run build` | 构建静态站到 `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm run daily` | **每天用这条**：建笔记 + 汇总 + 索引 + 提交 + 推送 |
| `npm run daily:draft` | 同上，但只写文件不提交（想先改改再用） |
| `npm run daily:status` | 只输出统计，不写文件 |
| `npm run note -- "标题" --tags a,b` | 新建主题笔记 |
| `npm run resource -- --category books --title "书名"` | 往资源表加一条 |

补记某一天：`node scripts/daily.mjs --date 2026-02-13`

## 目录结构

```
├── astro.config.mjs         站点配置（标题、侧边栏、部署路径）
├── src/
│   ├── sidebar.mjs          侧边栏生成：每日笔记自动按月分组
│   ├── content.config.ts    frontmatter 字段定义（date / tags / status）
│   ├── styles/custom.css    中文排版微调
│   └── content/docs/
│       ├── index.mdx        首页
│       ├── about.md         使用说明
│       ├── daily/           每日学习记录（一天一个文件）
│       │   ├── index.md     索引，脚本自动维护
│       │   └── 2026-02-14.md
│       ├── notes/           主题笔记，按概念组织
│       └── resources/       学习资源：课程 / 书籍 / 文章 / 工具
├── templates/               新建笔记用的模板
└── scripts/                 零依赖的 Node 脚本
```

三者的分工：

- **daily** 记录「今天发生了什么」——一次写完，不回改
- **notes** 沉淀「我搞明白了什么」——一页一个概念，持续改写
- **resources** 收录「值得再来的东西」——只记真用过的

## 每天的工作流

```bash
npm run daily          # 建好今天的页面
# 打开 src/content/docs/daily/2026-02-14.md 写收获
npm run daily          # 再跑一次：刷新汇总并提交推送
```

第一次跑是为了把页面建出来，第二次跑才会把你写的内容计入字数与提交。

笔记末尾的 `今日汇总` 区块由脚本维护（`<!-- daily:auto:start -->` 之间），**不要手改**——每次运行会被覆盖。

## 站点发布（当前未开启）

仓库是**私有**的，而 GitHub Pages 在免费账号下不支持私有仓库，
所以 `.github/workflows/deploy.yml` 被改名成 `.disabled` 停用了——
否则每次 push 都会留一条红色的失败记录。

笔记照常提交、照常在本地看：

```bash
npm run dev      # 本地写、本地预览
```

### 想真正发布成网站，二选一

**A. 把仓库改成公开（免费）**

1. Settings → General → 最底部 Change visibility → Public
2. `git mv .github/workflows/deploy.yml.disabled .github/workflows/deploy.yml`
3. Settings → Pages → Source 选 **GitHub Actions**
4. push 一次，站点上线

**B. 升级 GitHub Pro**

私有仓库也能发 Pages，同样把 workflow 改名回 `.yml` 即可。

发布地址会是 `https://yinrhh.github.io/lares-doc/`
（`astro.config.mjs` 里已按这个地址配好 `site` / `base`）。


## 两个约定

**站内链接用相对路径。** 站点可能部署在子路径下，`/daily/` 这种绝对路径会断，`../daily/` 不会。

**frontmatter 字段：**

```yaml
date: 2026-02-14                       # 内容日期
tags: [rust, memory]                   # 标签
status: seeded | growing | evergreen | archived   # 主题笔记的成熟度
```

## 技术栈

Astro 6 + Starlight 0.40，搜索用内置 Pagefind，脚本零依赖（只用 Node 内置模块）。
Node 版本 ≥ 22.12.0。

## 一个已知问题

如果 `npm` 报 `EPERM ... ~/.npm/_cacache`，是全局缓存目录权限坏了。仓库里的 `.npmrc`
已经把缓存指到 `.cache/npm` 绕开了；想彻底修复：

```bash
sudo chown -R $(id -u):$(id -g) ~/.npm
```
