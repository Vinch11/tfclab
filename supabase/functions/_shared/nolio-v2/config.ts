import { NolioError } from "./errors.ts";
export type EnvReader = (name: string) => string | undefined;
export interface Config {
  enabled: boolean;
  ownerId: string;
  expectedNolioUser: string;
  expectedApplicationName: string;
  connectionKey: string;
  environment: string;
  mode: string;
  origins: string[];
}
export function readConfig(env: EnvReader): Config {
  return {
    enabled: env("NOLIO_V2_ENABLED") === "true",
    ownerId: env("NOLIO_V2_OWNER_USER_ID") ?? "",
    expectedNolioUser: env("NOLIO_V2_EXPECTED_NOLIO_USER_ID") ?? "",
    expectedApplicationName: env("NOLIO_V2_EXPECTED_APP_NAME") ??
      "TFCLab development mock",
    connectionKey: env("NOLIO_V2_CONNECTION_KEY") ?? "tfc-development-mock",
    environment: env("NOLIO_V2_ENV") ?? "",
    mode: env("NOLIO_V2_MODE") ?? "mock",
    origins: (env("NOLIO_V2_ALLOWED_ORIGINS") ?? "http://localhost:5173").split(
      ",",
    ).map((x) => x.trim()).filter(Boolean),
  };
}
export function assertDevelopment(config: Config) {
  if (!config.enabled) throw new NolioError("disabled", 503);
  // There is deliberately no live mode in phase 1, even with an accidental real PAT.
  if (config.environment !== "development" || config.mode !== "mock") {
    throw new NolioError("mock_only", 403);
  }
  if (
    !config.ownerId ||
    (!config.expectedNolioUser.startsWith("usr_") ||
      config.expectedNolioUser.length <= 4 ||
      /[\s\u0000-\u001f\u007f]/.test(config.expectedNolioUser)) ||
    !config.connectionKey
  ) {
    throw new NolioError("configuration_error", 503);
  }
}
/** Future secret-backed provider; never imported into the browser or used by mock runtime. */
export function createPatProvider(env: EnvReader): () => string {
  return () => {
    const pat = env("NOLIO_V2_PAT");
    if (!pat || !/^nolio_sk_[A-Za-z0-9_]+$/.test(pat)) {
      throw new NolioError("configuration_error", 503);
    }
    return pat;
  };
}
