export {};

const origin = process.env.SERVICE_URL ?? "http://localhost:3000";

const sessionResponse = await fetch(`${origin}/api/order-chat/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    customerId: "customer_88",
    clientId: "browser_7",
  }),
});

if (!sessionResponse.ok) {
  throw new Error(`Could not create order room: ${await sessionResponse.text()}`);
}

const response = await fetch(`${origin}/api/order-chat/events`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    kind: "fulfillment_updated",
    orderId: "order_1042",
    customerId: "customer_88",
    accountId: "store_12",
    eventId: "f94f52f8-1700-4de7-9cc8-abe52b7ecf68",
    status: "shipped",
  }),
});

if (!response.ok) {
  throw new Error(`Could not publish order update: ${await response.text()}`);
}

console.log(JSON.stringify(await response.json(), null, 2));
