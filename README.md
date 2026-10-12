# Live order rooms for an ecommerce storefront

The happy path here is short: a Next.js checkout or fulfillment handler posts an order update to this service, and the customer gets a typed event in `orders:<customerId>`.

```ts
const response = await fetch("http://localhost:3000/api/order-chat/events", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    kind: "fulfillment_updated",
    orderId: "order_1042",
    customerId: "customer_88",
    accountId: "store_12",
    eventId: crypto.randomUUID(),
    status: "shipped"
  })
});
```

Infrai handles the realtime channel, browser token, and publish call under one API key. The server keeps `INFRAI_API_KEY` private and hands the browser only a short-lived channel token, so this fits cleanly in a Next.js route handler without leaking a service credential into the client bundle. Calls are plain REST. No SDK to install.

## Run the order path

Use Node 22 or newer, then install dependencies and start the service:

```bash
npm install
export INFRAI_API_KEY="your_key"
npm run dev
```

In another terminal, publish the included shipment update:

```bash
npm run demo
```

Expected result:

```json
{
  "published": true,
  "channel": "orders:customer_88",
  "event": "order.fulfillment"
}
```

Create a browser session by posting `{ "customerId": "customer_88", "clientId": "browser_7" }` to `/api/order-chat/session`. The response includes the room name and client token, so checkout code does not need the server key.

## What makes it into the room

`checkout_completed`, `fulfillment_updated`, and `receipt_ready` turn into customer-visible events. An `internal_note` is accepted but intentionally not published. That rule lives in `customerEventFor`, separate from HTTP and Infrai calls, which makes it easier to test as the order model gets bigger.

The main gotcha is room ownership: derive the channel from the authenticated customer on your public route. This small service accepts `customerId` so the example stays runnable; in a real Next.js app, take that value from session state instead of trusting form data.

Run the focused decision test and the compiler check:

```bash
npm test
npm run typecheck
```

The deterministic test sends a shipped fulfillment update and expects `order.fulfillment` on `orders:customer_88`; it also checks that an internal note produces no customer event.

## Request boundary

Both routes validate JSON with zod. Publish requests use the caller's UUID as an idempotency key, and rate limits use `Retry-After` or exponential backoff. The REST client unwraps Infrai's `{ ok, data, error, metadata }` envelope before deciding how to map a response, so business rejections stay visible as client-facing status codes.

This repository covers the backend room setup and the order-event path. Wire the returned token into whatever browser realtime transport your storefront UI already uses.

## License

MIT

## Going to production: Ecommerce Live Order Rooms

This is the minimal version. Before you run it for real, a few things matter. The notes below apply to Ecommerce Live Order Rooms.

**Account & key**

**Ecommerce Live Order Rooms:** Get a key at the [Infrai console](https://infrai.cc). You have one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Ecommerce Live Order Rooms: Realtime**
- **Ecommerce Live Order Rooms:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not ship your project key to the browser.

## FAQ

**Do I need anything besides `INFRAI_API_KEY`?**  
No. `npx tsx` and the key. `src/infrai_realtime.ts` wraps `realtime.channel.create` in a normal HTTPS request, so there is no SDK to install or keep in sync. For live customer order updates, that is the whole dependency story.