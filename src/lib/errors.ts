import { NextResponse } from "next/server";
import { ZodError } from "zod";

// `code` é o identificador estável do contrato de API (pensando na API pública da Fase 4).
// Nunca usar a `message` como algo que o cliente deva fazer match programático.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function notFound(code: string, message: string): ApiError {
  return new ApiError(404, code, message);
}

export function forbidden(code: string, message: string): ApiError {
  return new ApiError(403, code, message);
}

export function unauthenticated(): ApiError {
  return new ApiError(401, "UNAUTHENTICATED", "Autenticação necessária.");
}

export function conflict(code: string, message: string): ApiError {
  return new ApiError(409, code, message);
}

export function badRequest(code: string, message: string): ApiError {
  return new ApiError(400, code, message);
}

// Postgres unique_violation — usado quando duas requisições concorrentes disputam
// a mesma constraint única (ex: ordinal de revisão) e uma delas precisa perder de forma limpa.
// O driver node-postgres expõe `code` no erro, mas o Drizzle envolve isso numa
// DrizzleQueryError e move o erro original pra `.cause` — precisa checar os dois níveis.
function pgErrorCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const direct = (err as { code?: string }).code;
  if (direct) return direct;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) return (cause as { code?: string }).code;
  return undefined;
}

export function isUniqueViolation(err: unknown): boolean {
  return pgErrorCode(err) === "23505";
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") } },
      { status: 400 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Erro interno." } }, { status: 500 });
}

// Envolve um route handler para centralizar o try/catch -> formato { error: { code, message } }.
export function withErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<NextResponse>
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}
