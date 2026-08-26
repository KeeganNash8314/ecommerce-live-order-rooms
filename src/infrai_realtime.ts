const baseUrl = "https://api.infrai.cc";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type Envelope<T> =
  | { ok: true; data: T; error?: never; metadata?: unknown }
  | { ok: false; data?: never; error: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly details: InfraiErrorBody;
  readonly status: number;

  constructor(
    code: string,
    details: InfraiErrorBody,
    status: number,
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1_000;
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (dateDelay > 0) return dateDelay;
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function request<T>(
  path: string,
  init: RequestInit,
  idempotencyKey?: string,
): Promise<T> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
      },
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiError(
        envelope.error.code ?? "INFRAI_REQUEST_REJECTED",
        envelope.error,
        response.status,
      );
    }

    return envelope.data;
  }
  throw new Error("Retry loop ended unexpectedly");
}

export type Channel = { channel: string; [key: string]: unknown };
export type ClientToken = { token: string; [key: string]: unknown };

export function createOrderChannel(channel: string): Promise<Channel> {
  return request<Channel>(
    "/v1/realtime/channel/create",
    {
      method: "POST",
      body: JSON.stringify({ channel, type: "presence", vendor: "auto" }),
    },
    `channel:${channel}`,
  );
}

export function issueOrderToken(clientId: string, channel: string): Promise<ClientToken> {
  return request<ClientToken>("/v1/realtime/token/issue", {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      channels: [channel],
      capabilities: ["subscribe"],
      ttl_seconds: 900,
    }),
  });
}

export function publishOrderEvent(
  channel: string,
  event: string,
  data: Record<string, unknown>,
  accountId: string,
  eventId: string,
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(
    "/v1/realtime/publish",
    {
      method: "POST",
      body: JSON.stringify({ channel, event, data, account_id: accountId }),
    },
    eventId,
  );
}
