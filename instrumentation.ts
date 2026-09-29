import { reportServerError } from "@/lib/errors";

export function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string },
) {
  reportServerError(`${request.method} ${context.routePath || request.path} (${context.routeType})`, error);
}
