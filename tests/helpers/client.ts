import { NextRequest } from "next/server";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export interface CallOptions {
  method?: string;
  json?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

/** Minimal cookie-aware client that invokes App Router handlers directly. */
export function createClient(ip = "203.0.113.10") {
  const jar = new Map<string, string>();

  async function call(handler: unknown, path: string, opts: CallOptions = {}) {
    const headers = new Headers(opts.headers);
    headers.set("x-forwarded-for", ip);
    if (jar.size > 0) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      body = JSON.stringify(opts.json);
      headers.set("content-type", "application/json");
    } else if (opts.form) {
      body = opts.form;
    }
    const req = new NextRequest(new URL(path, "http://localhost:3000"), {
      method: opts.method ?? (body ? "POST" : "GET"),
      headers,
      body,
    });
    const res = await (handler as Handler)(req, { params: Promise.resolve(opts.params ?? {}) });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (!value || /max-age=0/i.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    return res;
  }

  return { call, jar };
}

export async function json<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T;
}


export function textFile(name: string, content: string, type = "text/plain") {
  return new File([content], name, { type });
}
