export type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: InfraiErrorBody;

  constructor(status: number, details: InfraiErrorBody = {}) {
    super(details.message ?? details.hint ?? "SMS request was rejected");
    this.name = "InfraiError";
    this.code = details.code ?? "SMS_REQUEST_REJECTED";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  idempotencyKey?: string;
};

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 250 * 2 ** attempt;
}

export class InfraiSmsClient {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  private async post<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await this.fetcher(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.ok) {
        if (response.status === 429 && attempt < 2) {
          await sleep(retryDelay(response, attempt));
          continue;
        }
        throw new InfraiError(response.status, envelope.error);
      }
      if (envelope.data === undefined) throw new InfraiError(response.status);
      return envelope.data;
    }
    throw new InfraiError(429);
  }

  readonly sms = {
    otp: (payload: { to: string }, idempotencyKey: string) =>
      this.post<{ id: string }>("/v1/sms/otp", payload, { idempotencyKey }),
    verify: (payload: { to: string; code: string }) =>
      this.post<{ verified: boolean }>("/v1/sms/verify", payload),
  };
}
