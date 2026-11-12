import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * 在 Starlight 默认 frontmatter 之上补充几个字段，
 * 这样每日笔记 / 主题笔记 / 资源页可以带上统一元信息。
 */
export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				/** 内容日期，YYYY-MM-DD（未加引号时 YAML 会解析成 Date，这里统一成字符串） */
				date: z
					.union([z.string(), z.date()])
					.optional()
					.transform((value) =>
						value instanceof Date ? value.toISOString().slice(0, 10) : value
					),
				/** 标签，用于检索与聚类 */
				tags: z.array(z.string()).default([]),
				/** 笔记成熟度：刚记下 → 在生长 → 常青 → 已归档 */
				status: z.enum(['seeded', 'growing', 'evergreen', 'archived']).optional(),
				/** 原始来源（链接、书名、课程名） */
				source: z.string().optional(),
			}),
		}),
	}),
};
