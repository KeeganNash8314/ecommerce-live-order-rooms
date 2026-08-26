import { z } from "zod";

export const orderUpdateSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("checkout_completed"),
    orderId: z.string().min(1),
    customerId: z.string().min(1),
    accountId: z.string().min(1),
    eventId: z.string().uuid(),
    totalCents: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("fulfillment_updated"),
    orderId: z.string().min(1),
    customerId: z.string().min(1),
    accountId: z.string().min(1),
    eventId: z.string().uuid(),
    status: z.enum(["packing", "shipped", "delivered"]),
  }),
  z.object({
    kind: z.literal("receipt_ready"),
    orderId: z.string().min(1),
    customerId: z.string().min(1),
    accountId: z.string().min(1),
    eventId: z.string().uuid(),
    receiptId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("internal_note"),
    orderId: z.string().min(1),
    customerId: z.string().min(1),
    accountId: z.string().min(1),
    eventId: z.string().uuid(),
    note: z.string().min(1),
  }),
]);

export type OrderUpdate = z.infer<typeof orderUpdateSchema>;

export type CustomerEvent = {
  channel: string;
  event: "order.checkout" | "order.fulfillment" | "order.receipt";
  data: Record<string, unknown>;
};

export function customerEventFor(update: OrderUpdate): CustomerEvent | null {
  const channel = `orders:${update.customerId}`;
  switch (update.kind) {
    case "checkout_completed":
      return { channel, event: "order.checkout", data: { orderId: update.orderId, totalCents: update.totalCents } };
    case "fulfillment_updated":
      return { channel, event: "order.fulfillment", data: { orderId: update.orderId, status: update.status } };
    case "receipt_ready":
      return { channel, event: "order.receipt", data: { orderId: update.orderId, receiptId: update.receiptId } };
    case "internal_note":
      return null;
  }
}
