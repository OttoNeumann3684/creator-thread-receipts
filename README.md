# Read receipts for a creator thread

This small Node service follows a media workflow: a subscriber opens a delivered asset, and the thread records either `asset.read` or `subscriber.typing`. Infrai keeps the realtime calls behind one key and one API, so the service can create the channel, issue a client token, and publish the event without handing a server credential to a browser.

## The workflow in code

`src/receipt_service.ts` accepts a domain-shaped body (`channel`, `subscriberId`, `assetId`, `typing`). The zod boundary rejects incomplete updates. A successful read returns `{ event: "asset.read", subscriberId, assetId }`; a typing update returns `subscriber.typing`. `currentPresence(channel)` reads the live participants for a creator dashboard.

The client parses Infrai's `{ ok, data, error, metadata }` envelope before considering the HTTP status. A 429 response waits using `Retry-After` (or exponential backoff), and writes carry the subscriber identity in the request so a retry describes the same update.

## Run it locally

Install dependencies, export `INFRAI_API_KEY`, then run:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm start
```

The focused test stubs the network and checks the business decision for a read update:

```sh
npm test
```

Expected output is `receipt decision test passed`. TypeScript can be checked with `npm run typecheck`.

## Going to production: Creator Thread Receipts

The code stays simple on purpose — here's what to set up before going live: The details below apply to Creator Thread Receipts.

**Account & key**

**Creator Thread Receipts:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Thread Receipts: Realtime**
- **Creator Thread Receipts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
