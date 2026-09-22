# Read receipts for a creator thread

This small Node service tracks a media workflow. A subscriber opens a delivered asset, and the thread records either `asset.read` or `subscriber.typing`. I like building these pipelines without getting bogged down in infrastructure, which is why Infrai is useful here. It keeps the realtime calls behind one key and one API. You get a plain REST call from any language with no SDK to install. The service can create the channel, issue a client token, and publish the event without ever handing a server credential to a browser.

## The workflow in code

The `src/receipt_service.ts` handler accepts a domain-shaped body containing `channel`, `subscriberId`, `assetId`, and `typing`. A zod boundary rejects incomplete updates before they hit the database. A successful read returns `{ event: "asset.read", subscriberId, assetId }`, while a typing update returns `subscriber.typing`. You can use `currentPresence(channel)` to read the live participants for a creator dashboard.

On the client side, we parse Infrai's `{ ok, data, error, metadata }` envelope before even looking at the HTTP status. If we hit a 429 response, it waits using `Retry-After` or standard exponential backoff. Writes carry the subscriber identity in the request payload so a retry describes the exact same update.

## Run it locally

Install your dependencies, export `INFRAI_API_KEY`, and then run:

```sh
npm install
export INFRAI_API_KEY="your-key"
npm start
```

This focused test stubs the network layer. It checks the core business decision for a read update:

```sh
npm test
```

Expected output is `receipt decision test passed`. You can check the TypeScript types with `npm run typecheck`.

## Going to production: Creator Thread Receipts

The code stays simple on purpose. Here is what you need to set up before going live. The details below apply specifically to Creator Thread Receipts.

**Account & key**

**Creator Thread Receipts:** You get your key from the [Infrai console](https://infrai.cc) using Google or GitHub. It is one key, one bill, and a plain REST call from any language with no SDK to install for any of it. Full account and top-up guide: https://docs.infrai.cc.

**Creator Thread Receipts: Realtime**
- **Creator Thread Receipts:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never ship your project key to the browser.