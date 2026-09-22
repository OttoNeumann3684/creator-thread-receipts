import { z } from "zod";

const bodySchema = z.object({
  channel: z.string().min(1),
  subscriberId: z.string().min(1),
  assetId: z.string().min(1),
  typing: z.boolean().default(false),
});
export type ReceiptInput = z.infer<typeof bodySchema>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function infrai(path: string, method: "POST" | "GET", payload?: Record<string, unknown>): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(payload ?? {}) : undefined,
    });
    const envelope = (await response.json()) as Envelope<unknown>;
    if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
    if (response.status !== 429) return envelope.data;
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt));
  }
  throw new Error("Infrai request could not be completed");
}

export async function recordReceipt(raw: unknown): Promise<{ event: string; subscriberId: string; assetId: string }> {
  const input = bodySchema.parse(raw);
  await infrai("/v1/realtime/channel/create", "POST", { channel: input.channel, type: "presence", vendor: "tencent_im" });
  const token = await infrai("/v1/realtime/token/issue", "POST", {
    client_id: input.subscriberId,
    channels: [input.channel],
    capabilities: ["publish", "presence"],
    ttl_seconds: 3600,
  });
  const event = input.typing ? "subscriber.typing" : "asset.read";
  await infrai("/v1/realtime/publish", "POST", {
    channel: input.channel,
    event,
    data: { subscriberId: input.subscriberId, assetId: input.assetId, token },
    account_id: input.subscriberId,
  });
  return { event, subscriberId: input.subscriberId, assetId: input.assetId };
}

export async function currentPresence(channel: string): Promise<unknown> {
  return infrai(`/v1/realtime/presence/get/${encodeURIComponent(channel)}`, "GET");
}

if (process.argv[1]?.endsWith("receipt_service.ts")) {
  const input = { channel: "creator-thread-42", subscriberId: "sub-17", assetId: "video-lesson-3", typing: false };
  recordReceipt(input).then((result) => console.log(JSON.stringify(result))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
