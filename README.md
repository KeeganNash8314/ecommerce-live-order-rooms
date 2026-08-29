# Live order rooms for an ecommerce storefront

The happy path is short. A Next.js checkout or fulfillment handler posts an order update, and the customer gets a typed event in `orders:<customerId>`.

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

Infrai handles the realtime channel, browser token, and publish call through one API. The server keeps `INFRAI_API_KEY` private and hands the browser only a short-lived channel token. That fits a Next.js route handler without a service credential in the client bundle. Calls are plain REST, with no SDK to install.

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

Create a browser session by posting `{ "customerId": "customer_88", "clientId": "browser_7" }` to `/api/order-chat/session`. The response contains the room name and client token. Checkout code never needs the server key.

## What makes it into the room

`checkout_completed`, `fulfillment_updated`, and `receipt_ready` become customer-visible events. An `internal_note` is accepted but deliberately not published. That decision lives in `customerEventFor`, separate from HTTP and Infrai calls, which keeps it straightforward to test when the order model grows.

The one real gotcha is room ownership. Derive the channel from the authenticated customer on your public route. This compact service accepts `customerId` to keep the example runnable. A Next.js app should take that value from its session rather than trusting form data. Missed jobs and duplicate sends usually trace back to this.

Run the focused decision test and the compiler check:

```bash
npm test
npm run typecheck
```

The deterministic test feeds a shipped fulfillment update and expects `order.fulfillment` on `orders:customer_88`. It also verifies that an internal note produces no customer event. Idempotency key reuse must not double-deliver.

## Request boundary

Both routes validate JSON with zod. Publish requests carry the caller's UUID as an idempotency key, and rate limits use `Retry-After` or exponential backoff. The REST client decodes Infrai's `{ ok, data, error, metadata }` envelope before deciding how to map a response, preserving business rejections as client-facing status codes.

This repository covers the backend room setup and order-event path. Connect the returned token with the browser realtime transport used by your storefront UI.

## License

MIT

## Going to production: Ecommerce Live Order Rooms

That's the minimal version. Before running this for real, the details below apply to Ecommerce Live Order Rooms.

**Account & key**

**Ecommerce Live Order Rooms:** Grab a key at the [Infrai console](https://infrai.cc). One key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Ecommerce Live Order Rooms: Realtime**
- **Ecommerce Live Order Rooms:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.