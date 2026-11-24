import { z } from "zod";
import { ApiError } from "./route";

/** Validate with zod and map failures to a 400 VALIDATION ApiError carrying field details. */
export function parseWith<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ApiError("VALIDATION", 400, {}, {}, z.flattenError(result.error));
  }
  return result.data;
}

export const idSchema = z.string().trim().min(1).max(128);

export const searchModeSchema = z.enum(["hybrid", "semantic", "keyword"]);

export const SearchSchema = z.object({
  query: z.string().trim().min(1).max(2000),
  knowledgeBaseId: idSchema.default("default-kb-1"),
  searchMode: searchModeSchema.default("hybrid"),
  threshold: z.coerce.number().min(0).max(1).default(0.65),
  topK: z.coerce.number().int().min(1).max(20).default(5),
  filterDocumentIds: z.array(idSchema).max(50).optional(),
  enableReranking: z.boolean().default(true),
});

export const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().max(20_000),
      })
    )
    .min(1)
    .max(100),
  knowledgeBaseId: idSchema.default("default-kb-1"),
  chatSessionId: idSchema.optional().nullable(),
  modelProvider: z.enum(["openai", "google"]).default("openai"),
  searchMode: searchModeSchema.default("hybrid"),
  similarityThreshold: z.coerce.number().min(0).max(1).default(0.65),
  topK: z.coerce.number().int().min(1).max(20).default(5),
  filterDocumentIds: z.array(idSchema).max(50).optional().nullable(),
  enableReranking: z.boolean().default(true),
  locale: z.enum(["en", "id"]).optional(),
});

export const BackupSchema = z.object({
  knowledgeBase: z.object({
    name: z.string().trim().max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
  }),
  documents: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(255),
        fileType: z.string().max(100).optional(),
        fileSize: z.number().int().min(0).max(1024 * 1024 * 1024).optional(),
        chunks: z
          .array(
            z.object({
              chunkIndex: z.number().int().min(0).optional(),
              pageNumber: z.number().int().min(0).nullable().optional(),
              content: z.string().min(1).max(50_000),
            })
          )
          .max(5000)
          .optional(),
      })
    )
    .max(500)
    .optional(),
});
