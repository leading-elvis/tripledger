import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { repository } from "@/lib/repository.mjs";
import { handleApi } from "@/lib/api.mjs";
import hosting from "@/.openai/hosting.json";

async function route(request: Request) {
  const user = await getChatGPTUser();
  const bindings = env as unknown as { DB: D1Database; BUCKET: R2Bucket };
  const db = bindings.DB;
  return handleApi(request, {
    subject: user ? `${hosting.project_id}:${user.userId}` : null,
    profile: user ? {name:user.displayName,email:user.email} : {},
    repo: repository({
      get: (sql: string, values: unknown[]) => db.prepare(sql).bind(...values).first(),
      all: async (sql: string, values: unknown[]) => (await db.prepare(sql).bind(...values).all()).results,
      run: async (sql: string, values: unknown[]) => (await db.prepare(sql).bind(...values).run()).meta.changes,
    }),
    objects: {
      get: async (key: string) => { const object = await bindings.BUCKET.get(key); return object ? new Uint8Array(await object.arrayBuffer()) : null; },
      put: (key: string, bytes: Uint8Array, mime: string) => bindings.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } }),
      delete: (key: string) => bindings.BUCKET.delete(key),
    },
  });
}
export const GET = route;
export const POST = route;
