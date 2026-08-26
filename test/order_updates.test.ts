import { describe, expect, it } from "vitest";
import { customerEventFor } from "../src/order_updates.js";

describe("customerEventFor", () => {
  it("turns a shipped order into a customer-scoped fulfillment event", () => {
    const event = customerEventFor({
      kind: "fulfillment_updated",
      orderId: "order_1042",
      customerId: "customer_88",
      accountId: "store_12",
      eventId: "f94f52f8-1700-4de7-9cc8-abe52b7ecf68",
      status: "shipped",
    });

    expect(event).toEqual({
      channel: "orders:customer_88",
      event: "order.fulfillment",
      data: { orderId: "order_1042", status: "shipped" },
    });
  });

  it("keeps an internal note out of the customer room", () => {
    const event = customerEventFor({
      kind: "internal_note",
      orderId: "order_1042",
      customerId: "customer_88",
      accountId: "store_12",
      eventId: "53b9bcb2-88d2-4d74-8600-f86a2d6bab98",
      note: "Check gift wrap before dispatch",
    });

    expect(event).toBeNull();
  });
});
