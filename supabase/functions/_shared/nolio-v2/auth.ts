import type { Config } from "./config.ts";
import { NolioError } from "./errors.ts";
export interface Identity {
  id: string;
}
export type VerifyUser = (jwt: string) => Promise<Identity | null>;
export async function requireOwner(
  req: Request,
  config: Config,
  verify: VerifyUser,
): Promise<string> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ") || !auth.slice(7).trim()) {
    throw new NolioError("not_authenticated", 401);
  }
  let user: Identity | null;
  try {
    user = await verify(auth.slice(7));
  } catch {
    throw new NolioError("not_authenticated", 401);
  }
  if (!user?.id) throw new NolioError("not_authenticated", 401);
  if (!config.ownerId || user.id !== config.ownerId) {
    throw new NolioError("owner_required", 403);
  }
  return user.id;
}
