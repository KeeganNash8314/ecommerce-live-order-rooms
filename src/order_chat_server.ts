import express from "express";
import { ZodError, z } from "zod";
import { createOrderChannel, InfraiError, issueOrderToken, publishOrderEvent } from "./infrai_realtime.js";
import { customerEventFor, orderUpdateSchema } from "./order_updates.js";

const app = express();
app.use(express.json());

const subscriptionSchema = z.object({
  customerId: z.string().min(1),
  clientId: z.string().min(1),
});

app.post("/api/order-chat/session", async (request, response, next) => {
  try {
    const input = subscriptionSchema.parse(request.body);
    const channel = `orders:${input.customerId}`;
    await createOrderChannel(channel);
    const credential = await issueOrderToken(input.clientId, channel);
    response.status(201).json({ channel, token: credential.token });
  } catch (error) {
    next(error);
  }
});

app.post("/api/order-chat/events", async (request, response, next) => {
  try {
    const update = orderUpdateSchema.parse(request.body);
    const event = customerEventFor(update);
    if (!event) {
      response.status(202).json({ published: false, reason: "internal_update" });
      return;
    }
    await publishOrderEvent(event.channel, event.event, event.data, update.accountId, update.eventId);
    response.status(202).json({ published: true, channel: event.channel, event: event.event });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "invalid_request", details: error.flatten() });
    return;
  }
  if (error instanceof InfraiError) {
    response.status(error.status >= 400 && error.status < 500 ? error.status : 502).json({
      error: error.code,
      message: error.message,
    });
    return;
  }
  response.status(500).json({ error: "unexpected_error" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Order chat service listening on http://localhost:${port}`));
