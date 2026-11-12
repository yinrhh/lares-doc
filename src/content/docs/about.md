---
title: 这个库怎么用
description: 目录约定、写作规范与每天的一键提交流程
---

## 目录结构

```
src/content/docs/
├── index.mdx            首页
├── about.md             这一页
├── daily/               每日学习记录，一天一个文件
│   ├── index.md         索引（脚本自动维护）
│   └── 2026-02-14.md
├── notes/               主题笔记，按主题沉淀
└── resources/           学习资源，按类型收录
```

文件即内容，写完存盘刷新浏览器就能看到，不需要改任何配置。

## 每天怎么用

只有一条命令：

```bash
npm run daily
```

它会依次做四件事：

1. 建好今天的笔记 `daily/YYYY-MM-DD.md`（已存在就跳过，绝不覆盖你写的内容）
2. 统计今天的改动 —— 改了几个文件、写了多少字、动了哪些主题笔记
3. 把统计写回今天笔记末尾的「今日汇总」区块，并刷新 `daily/index.md` 的索引与打卡统计
4. `git add` → `commit` → `push`

想先看再提交：

```bash
npm run daily:draft    # 只生成 + 汇总，不碰 git
npm run daily:status   # 只看统计，什么都不写
```

## 写什么

每日笔记的骨架是固定的，别删标题，按需填内容：

| 区块 | 写什么 |
| --- | --- |
| 今日目标 | 今天想搞懂什么，1–3 条 |
| 学习输入 | 看了什么：文章、视频、课程、文档，附链接 |
| 核心收获 | 用自己的话写，一条一个要点 |
| 动手实践 | 跑通的命令、写过的代码、踩过的坑 |
| 待解决问题 | 还没懂的，明天继续 |
| 关联 | 链接到 `notes/` 里的主题笔记 |

## 新建主题笔记 / 资源

```bash
npm run note -- "Rust 所有权" --tags rust,memory
npm run resource -- --category books --title "深入理解计算机系统"
```

资源命令会新建一条记录并写进对应的资源表，之后再手动补评价。

## 站内链接用相对路径

因为站点可能部署在 `https://<user>.github.io/<repo>/` 这样的子路径下，
**绝对路径 `/daily/` 会失效**，相对路径不会：

```markdown
[昨天的记录](../daily/2026-02-13/)
[主题笔记](../notes/rust-ownership/)
```

## 远端仓库与发布

远程仓库已关联：`https://github.com/yinrhh/lares-doc`（**私有**）。

私有仓库在免费账号下用不了 GitHub Pages，所以发布用的 workflow 目前停用中
（`.github/workflows/deploy.yml.disabled`）。笔记照常提交，只是还没有对外网址。

想发布成网站，README 的「站点发布」一节有两条路：把仓库改成公开（免费），或升级 GitHub Pro。

