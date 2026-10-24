import type { ReadResult } from "./contracts.ts";
import { NolioClient } from "./client.ts";
import { NolioError, object, safeError } from "./errors.ts";
export async function paginate<T>(
  client: NolioClient,
  path: string,
  params: Record<string, string>,
  adapt: (row: unknown) => T,
  maxPages = 20,
): Promise<ReadResult<T[]>> {
  const data: T[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  try {
    for (let page = 0; page < maxPages; page++) {
      const body = object(
        await client.get(path, {
          ...params,
          limit: "100",
          ...(cursor ? { starting_after: cursor } : {}),
        }),
      );
      if (
        !Array.isArray(body.data) || typeof body.has_more !== "boolean" ||
        body.data.length > 100
      ) {
        throw new NolioError("invalid_response", 502);
      }
      const rows = body.data.map((row) => ({
        raw: object(row),
        dto: adapt(row),
      }));
      const ids = rows.map((x) => x.raw.id);
      if (
        ids.some((id) => typeof id !== "string" || !id || seen.has(id)) ||
        new Set(ids).size !== ids.length
      ) {
        throw new NolioError("pagination_stalled", 502);
      }
      // Commit a page only after validating every row, so a retry cannot hide lost rows.
      for (const row of rows) {
        seen.add(row.raw.id as string);
        data.push(row.dto);
      }
      if (!body.has_more) {
        return {
          data,
          availability: "complete",
          issue: null,
          nextCursor: null,
          quota: client.quota,
        };
      }
      if (!rows.length) throw new NolioError("pagination_stalled", 502);
      cursor = rows.at(-1)!.raw.id as string;
    }
    throw new NolioError("page_limit", 206);
  } catch (e) {
    const issue = safeError(e).issue();
    const accessEnded = issue.status === 401 || issue.status === 403;
    return {
      data: accessEnded ? [] : data,
      availability: accessEnded
        ? (issue.status === 403 ? "denied" : "unavailable")
        : data.length
        ? "partial"
        : "unavailable",
      issue,
      nextCursor: accessEnded ? null : cursor,
      quota: client.quota,
    };
  }
}
