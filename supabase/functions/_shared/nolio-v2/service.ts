import type { Config } from "./config.ts";
import { assertDevelopment } from "./config.ts";
import { NolioClient } from "./client.ts";
import type { Transport } from "./client.ts";
import { requireOwner } from "./auth.ts";
import type { VerifyUser } from "./auth.ts";
import { calendarCollections } from "./contracts.ts";
import type { EventKind, PlannedEventDTO, ReadResult } from "./contracts.ts";
import { isObject, NolioError, object } from "./errors.ts";
import {
  athlete,
  dateWindow,
  planned,
  publicId,
  sport,
  zones,
} from "./adapters.ts";
import { paginate } from "./pagination.ts";
import type { LinkStore } from "./store.ts";
export interface Dependencies {
  config: Config;
  verifyUser: VerifyUser;
  store: LinkStore;
  transport: Transport;
  token: () => string;
}
export async function execute(
  req: Request,
  payload: unknown,
  deps: Dependencies,
  endpoint: "read" | "links",
) {
  const coach = await requireOwner(req, deps.config, deps.verifyUser);
  assertDevelopment(deps.config);
  if (!isObject(payload)) throw new NolioError("invalid_request", 400);
  const body = payload;
  const action = body.action;
  const readActions = ["status", "athletes", "sports", "zones", "calendar"];
  const linkActions = ["get", "associate", "unlink"];
  if (
    typeof action !== "string" ||
    !(endpoint === "read" ? readActions : linkActions).includes(action)
  ) throw new NolioError("invalid_request", 400);
  const needsAthlete = !["status", "athletes"].includes(action);
  const local = body.athleteId;
  if (needsAthlete) {
    if (typeof local !== "string" || !/^[0-9a-f-]{36}$/i.test(local)) {
      throw new NolioError("invalid_request", 400);
    }
    if (!await deps.store.ownsAthlete(coach, local)) {
      throw new NolioError("athlete_not_owned", 403);
    }
  }
  // Local cleanup never requires a still-valid Nolio grant.
  if (endpoint === "links") {
    if (action === "get") {
      return deps.store.get(coach, deps.config.connectionKey, local as string);
    }
    if (action === "unlink") {
      await deps.store.unlink(
        coach,
        deps.config.connectionKey,
        local as string,
      );
      return { removed: true };
    }
    if (body.confirmed !== true) {
      throw new NolioError("confirmation_required", 400);
    }
    publicId(body.nolioUserId, "usr");
  }
  const requestedWindow = action === "calendar"
    ? dateWindow(body.from, body.to)
    : null;
  const client = new NolioClient({
    transport: deps.transport,
    token: deps.token,
  });
  const status = await client.verify(
    deps.config.expectedNolioUser,
    deps.config.expectedApplicationName,
  );
  if (action === "status") return status;
  const athletes = await paginate(client, "/api/v2/me/athletes/", {}, athlete);
  if (action === "athletes") return athletes;
  if (athletes.availability !== "complete") {
    throw new NolioError(
      athletes.issue?.code ?? "unavailable",
      athletes.issue && athletes.issue.status >= 400
        ? athletes.issue.status
        : 503,
      athletes.issue?.retryAfter ?? null,
    );
  }
  if (endpoint === "links") {
    const candidate = athletes.data.find((x) => x.id === body.nolioUserId);
    if (!candidate?.hasApiAccess) {
      throw new NolioError("athlete_api_access_denied", 403);
    }
    // Verify the intended universe for this athlete, not only membership in the candidate list.
    const probe = object(
      await client.get("/api/v2/planned/trainings/", {
        athlete: candidate.id,
        limit: "1",
      }),
    );
    if (!Array.isArray(probe.data) || typeof probe.has_more !== "boolean") {
      throw new NolioError("invalid_response", 502);
    }
    return deps.store.associate(
      coach,
      deps.config.connectionKey,
      local as string,
      candidate.id,
    );
  }
  const link = await deps.store.get(
    coach,
    deps.config.connectionKey,
    local as string,
  );
  if (!link) throw new NolioError("link_required", 409);
  if (!athletes.data.some((x) => x.id === link.nolioUserId && x.hasApiAccess)) {
    throw new NolioError("athlete_api_access_denied", 403);
  }
  const params = { athlete: link.nolioUserId };
  if (action === "sports") {
    return {
      catalog: await paginate(
        client,
        "/api/v2/sports/",
        {},
        (row) => sport(row),
      ),
      profiles: await paginate(
        client,
        "/api/v2/settings/sports/",
        params,
        (row) => sport(row, true),
      ),
    };
  }
  if (action === "zones") {
    try {
      return {
        data: zones(await client.get("/api/v2/settings/zones/final/", params)),
        availability: "complete",
        quota: client.quota,
        issue: null,
        nextCursor: null,
      };
    } catch (e) {
      if (!(e instanceof NolioError)) throw e;
      return {
        data: [],
        availability: e.status === 403 ? "denied" : "unavailable",
        quota: client.quota,
        issue: e.issue(),
        nextCursor: null,
      };
    }
  }
  const window = requestedWindow!;
  const collections = {} as Record<EventKind, ReadResult<PlannedEventDTO[]>>;
  for (const [kind, path] of Object.entries(calendarCollections)) {
    collections[kind as EventKind] = await paginate(
      client,
      `/api/v2/planned/${path}/`,
      { ...params, date_from: window.from, date_to: window.to },
      (row) => planned(row, kind as EventKind),
    );
    const result = collections[kind as EventKind];
    // Stop immediately on a revoked/forbidden grant, and discard earlier cached athlete data.
    if (result.issue?.status === 401 || result.issue?.status === 403) {
      for (const k of Object.keys(calendarCollections) as EventKind[]) {
        collections[k] = {
          ...result,
          data: [],
          availability: result.issue.status === 403 ? "denied" : "unavailable",
        };
      }
      break;
    }
  }
  return { ...window, collections };
}
