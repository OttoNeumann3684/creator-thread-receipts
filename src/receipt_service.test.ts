import assert from "node:assert/strict";
import { recordReceipt } from "./receipt_service.js";

const calls: Array<{ path: string; body?: Record<string, unknown> }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  calls.push({ path: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
  return new Response(JSON.stringify({ ok: true, data: { token: "issued" } }), { status: 200, headers: { "content-type": "application/json" } });
};
const result = await recordReceipt({ channel: "thread-1", subscriberId: "sub-1", assetId: "asset-9", typing: false });
assert.equal(result.event, "asset.read");
assert.equal(calls[2].body?.event, "asset.read");
assert.equal(calls[2].body?.data && (calls[2].body.data as Record<string, unknown>).assetId, "asset-9");
globalThis.fetch = originalFetch;
console.log("receipt decision test passed");
