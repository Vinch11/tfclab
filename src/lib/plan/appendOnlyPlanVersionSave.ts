/**
 * Sauvegarde append-only d'une version de plan (`plan_versions`), fail-closed.
 *
 * IDENTITÉ D'ÉCRITURE DURABLE (v1, 2026-11-02)
 * - L'id de la ligne est DÉRIVÉ du contenu : SHA-256 de
 *   `IDENTITY_DOMAIN + "\n" + JSON canonique du payload` (athlète, coach,
 *   plan, métadonnées) SAUF `plan_json._provenance.generatedAt` (cf.
 *   `identityView`), encodé en UUID RFC 9562 version 8 (variant 10). La ligne
 *   stockée conserve l'horodatage effectivement écrit la première fois.
 * - Même contenu + même coach + même athlète ⇒ même id, quel que soit
 *   l'onglet, l'instance, le rechargement, l'appareil ou le délai : la clé
 *   primaire existante empêche physiquement le doublon. Aucun sessionStorage,
 *   aucun TTL, aucune nouvelle contrainte SQL.
 * - Contenu / coach / athlète différent ⇒ id différent.
 * - Après chaque INSERT (succès, erreur ou réponse perdue) : READ-BACK par id.
 *   Seule une ligne relue ET identique donne CONFIRMED. Une ligne présente
 *   sous cet id mais divergente (collision ou métadonnée différente) ⇒
 *   BLOCKED, jamais d'UPDATE / UPSERT / DELETE.
 * - Le payload est validé AVANT envoi : JSON strict (pas de NaN/Infinity,
 *   undefined, fonction, BigInt, Date, cycle…). Une clé `id` dans le payload
 *   est refusée : elle ne peut jamais remplacer l'id calculé.
 *
 * PORTÉE DES ANCIENNES TENTATIVES (UUID aléatoire, avant v1)
 * Les lignes déjà écrites avec un UUID aléatoire (y compris les tentatives
 * mémorisées dans l'ancienne clé sessionStorage `tfcl.planVersionAttempts.v1`)
 * ne sont NI migrées NI reconnues : resauvegarder le même contenu crée une
 * ligne à id déterministe distincte. Aucun résultat ne prétend le contraire
 * (`identity: "content-sha256-v1"`, `legacyScope: "not_reconciled"`).
 */

export type SaveStatus =
  | "CONFIRMED" // relu en base, identique
  | "UNKNOWN" // impossible de savoir : ne pas affirmer échec ni succès
  | "FAILED" // refus explicite et absence vérifiée (ou refus d'accès confirmé)
  | "BLOCKED" // ligne présente sous ce même id mais contenu différent / conflit invisible
  | "IN_PROGRESS" // une sauvegarde est déjà en cours : aucune requête envoyée
  | "NOT_SENT"; // payload illégal ou empreinte indisponible : rien envoyé (fail-closed)

export interface PlanVersionRow {
  id: string;
  athlete_id: string;
  coach_id: string;
  plan_json: unknown;
  objective: string | null;
  weeks_count: number | null;
  sessions_count: number | null;
  validator_score: number | null;
  validator_grade: string | null;
  validator_summary: unknown;
}

export type PlanVersionPayload = Omit<PlanVersionRow, "id">;

export interface TransportError {
  code?: string;
  message?: string;
  status?: number;
}

export interface PlanVersionTransport {
  insert(row: PlanVersionRow): Promise<{ error: TransportError | null }>;
  readById(id: string): Promise<{ data: PlanVersionRow | null; error: TransportError | null }>;
}

export const IDENTITY_SCHEME = "content-sha256-v1" as const;
export const IDENTITY_DOMAIN = "tfcl.plan_versions.identity.v1";

export interface SaveResult {
  status: SaveStatus;
  attemptId: string | null;
  /** Code court, sans données du plan. */
  reason: string;
  identity: typeof IDENTITY_SCHEME;
  /** Les anciennes lignes à UUID aléatoire ne sont jamais rapprochées. */
  legacyScope: "not_reconciled";
}

export const READBACK_COLUMNS =
  "id,athlete_id,coach_id,plan_json,objective,weeks_count,sessions_count,validator_score,validator_grade,validator_summary";

const PAYLOAD_KEYS: ReadonlyArray<keyof PlanVersionPayload> = [
  "athlete_id", "coach_id", "plan_json", "objective", "weeks_count",
  "sessions_count", "validator_score", "validator_grade", "validator_summary",
];

export class IllegalPayloadError extends Error {
  constructor(public readonly code: string) { super(code); }
}

/**
 * Vérifie qu'une valeur est du JSON strict (ce que jsonb stocke à l'identique).
 * Les clés d'objet à `undefined` sont tolérées et retirées (comme JSON.stringify).
 */
export function assertStrictJson(value: unknown, seen: Set<object> = new Set()): void {
  if (value === null) return;
  const t = typeof value;
  if (t === "string" || t === "boolean") return;
  if (t === "number") {
    if (!Number.isFinite(value as number)) throw new IllegalPayloadError("non_finite_number");
    return;
  }
  if (t !== "object") throw new IllegalPayloadError(`illegal_${t}`);
  const obj = value as object;
  if (seen.has(obj)) throw new IllegalPayloadError("cyclic");
  seen.add(obj);
  if (Array.isArray(obj)) {
    for (const v of obj) {
      if (v === undefined) throw new IllegalPayloadError("undefined_in_array");
      assertStrictJson(v, seen);
    }
  } else {
    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) throw new IllegalPayloadError("non_plain_object");
    for (const [, v] of Object.entries(obj)) {
      if (v === undefined) continue;
      assertStrictJson(v, seen);
    }
  }
  seen.delete(obj);
}

/**
 * JSON canonique : clés triées, `undefined` retiré (comme JSON/jsonb).
 * Les objets sont reconstruits par `Object.fromEntries` (propriétés propres) :
 * une clé JSON valide comme `__proto__`, `constructor` ou `prototype` est
 * conservée telle quelle, jamais avalée par un setter de prototype.
 */
export function canonicalJson(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(norm);
    const src = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(src).sort().map((k) => [k, norm(src[k])]));
  };
  return JSON.stringify(norm(JSON.parse(JSON.stringify(value ?? null))));
}

/** SHA-256 hex via WebCrypto. Lève si indisponible (fail-closed). */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("crypto_unavailable");
  const buf = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 128 premiers bits du SHA-256 → UUID v8 (version 8, variant 10xx). */
export function uuidV8FromSha256Hex(hex: string): string {
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error("bad_hash");
  const h = hex.slice(0, 32).split("");
  h[12] = "8";
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

export const UUID_V8_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Valide puis fige le payload (seules les colonnes attendues ; `id` refusé).
 * Lève IllegalPayloadError.
 */
export function freezePayload(payload: PlanVersionPayload): PlanVersionPayload {
  if (!payload || typeof payload !== "object") throw new IllegalPayloadError("not_object");
  const keys = Object.keys(payload);
  if (keys.includes("id")) throw new IllegalPayloadError("payload_has_id");
  for (const k of keys) {
    if (!(PAYLOAD_KEYS as string[]).includes(k)) throw new IllegalPayloadError("unexpected_key");
  }
  if (typeof payload.athlete_id !== "string" || !payload.athlete_id) throw new IllegalPayloadError("athlete_id");
  if (typeof payload.coach_id !== "string" || !payload.coach_id) throw new IllegalPayloadError("coach_id");
  assertStrictJson(payload);
  const out = {} as Record<string, unknown>;
  for (const k of PAYLOAD_KEYS) out[k] = (payload as unknown as Record<string, unknown>)[k] ?? null;
  return JSON.parse(JSON.stringify(out)) as PlanVersionPayload;
}

/**
 * Vue d'identité : le payload complet SAUF l'horodatage de génération
 * `plan_json._provenance.generatedAt` (seul champ volatil). Pourquoi : une
 * régénération à l'identique (nouvel onglet/contexte) produisait un nouvel id et
 * donc une version dupliquée. La ligne stockée conserve le premier horodatage.
 * Les lignes déjà écrites avec l'ancien calcul (horodatage inclus) ne sont pas
 * réconciliées.
 */
export function identityView<T extends { plan_json?: unknown }>(row: T): T {
  const pj = row.plan_json as Record<string, unknown> | null | undefined;
  const prov = pj && typeof pj === "object" && !Array.isArray(pj) ? (pj._provenance as Record<string, unknown> | undefined) : undefined;
  if (!prov || typeof prov !== "object" || Array.isArray(prov) || !("generatedAt" in prov)) return row;
  const { generatedAt: _volatile, ...rest } = prov;
  return { ...row, plan_json: { ...pj, _provenance: rest } };
}

/** Id déterministe d'un payload déjà figé. */
export async function derivePlanVersionId(
  frozen: PlanVersionPayload,
  hash: (text: string) => Promise<string> = sha256Hex,
): Promise<string> {
  return uuidV8FromSha256Hex(await hash(`${IDENTITY_DOMAIN}\n${canonicalJson(identityView(frozen))}`));
}

export function rowMatches(expected: PlanVersionRow, actual: PlanVersionRow): boolean {
  if (actual.id !== expected.id) return false;
  if (actual.athlete_id !== expected.athlete_id) return false;
  if (actual.coach_id !== expected.coach_id) return false;
  if ((actual.objective ?? null) !== (expected.objective ?? null)) return false;
  if ((actual.weeks_count ?? null) !== (expected.weeks_count ?? null)) return false;
  if ((actual.sessions_count ?? null) !== (expected.sessions_count ?? null)) return false;
  if ((actual.validator_grade ?? null) !== (expected.validator_grade ?? null)) return false;
  const numEq = (a: number | null, b: number | null) =>
    a == null || b == null ? a == b : Number(a) === Number(b);
  if (!numEq(actual.validator_score, expected.validator_score)) return false;
  if (canonicalJson(actual.validator_summary) !== canonicalJson(expected.validator_summary)) return false;
  return canonicalJson(identityView(actual).plan_json) === canonicalJson(identityView(expected).plan_json);
}

const AUTH_CODES = new Set(["42501", "PGRST301", "PGRST302", "401", "403"]);
const isAuthError = (e: TransportError) =>
  AUTH_CODES.has(String(e.code ?? "")) || e.status === 401 || e.status === 403;

class TimeoutError extends Error {}
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new TimeoutError("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

type InsertOutcome =
  | { kind: "ok" }
  | { kind: "duplicate" }
  | { kind: "auth"; code: string }
  | { kind: "rejected"; code: string }
  | { kind: "lost" }; // exception réseau / timeout : commit possible

/** Ancienne clé sessionStorage (avant v1) : jamais lue pour l'identité. */
export const LEGACY_ATTEMPT_STORAGE_KEY = "tfcl.planVersionAttempts.v1";

export interface SaverOptions {
  transport: PlanVersionTransport;
  timeoutMs?: number;
  hash?: (text: string) => Promise<string>;
}

export class AppendOnlyPlanVersionSaver {
  private inFlight = false;
  private lastId: string | null = null;
  private readonly transport: PlanVersionTransport;
  private readonly timeoutMs: number;
  private readonly hash: (text: string) => Promise<string>;

  constructor(opts: SaverOptions) {
    this.transport = opts.transport;
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.hash = opts.hash ?? sha256Hex;
  }

  get isPending(): boolean {
    return this.inFlight;
  }

  private result(status: SaveStatus, attemptId: string | null, reason: string): SaveResult {
    return { status, attemptId, reason, identity: IDENTITY_SCHEME, legacyScope: "not_reconciled" };
  }

  private async readBack(id: string) {
    try {
      const rb = await withTimeout(this.transport.readById(id), this.timeoutMs);
      return rb.error ? ("unavailable" as const) : rb;
    } catch {
      return "unavailable" as const;
    }
  }

  async save(payload: PlanVersionPayload): Promise<SaveResult> {
    if (this.inFlight) return this.result("IN_PROGRESS", this.lastId, "already_pending");
    this.inFlight = true;
    try {
      return await this.saveInner(payload);
    } finally {
      this.inFlight = false;
    }
  }

  private async saveInner(payload: PlanVersionPayload): Promise<SaveResult> {
    let frozen: PlanVersionPayload;
    try {
      frozen = freezePayload(payload);
    } catch (e) {
      const code = e instanceof IllegalPayloadError ? e.code : "invalid";
      return this.result("NOT_SENT", null, `illegal_payload_${code}`);
    }
    let id: string;
    try {
      id = await derivePlanVersionId(frozen, this.hash);
      if (!UUID_V8_RE.test(id)) throw new Error("bad_id");
    } catch {
      return this.result("NOT_SENT", null, "fingerprint_unavailable");
    }
    this.lastId = id;
    // `id` posé EN DERNIER : rien dans le payload ne peut le remplacer.
    const row: PlanVersionRow = { ...frozen, id };

    // Déjà écrite (autre onglet, ACK perdu, réouverture) ? Read-back d'abord.
    const rb0 = await this.readBack(id);
    if (rb0 !== "unavailable" && rb0.data) {
      if (rowMatches(row, rb0.data)) return this.result("CONFIRMED", id, "already_present_identical");
      return this.result("BLOCKED", id, "readback_mismatch");
    }

    let outcome: InsertOutcome;
    try {
      const { error } = await withTimeout(this.transport.insert(row), this.timeoutMs);
      if (!error) outcome = { kind: "ok" };
      else if (String(error.code) === "23505") outcome = { kind: "duplicate" };
      else if (isAuthError(error)) outcome = { kind: "auth", code: String(error.code ?? error.status ?? "auth") };
      else if (!error.code && !error.status) outcome = { kind: "lost" }; // erreur fetch sans réponse serveur
      else outcome = { kind: "rejected", code: String(error.code ?? error.status) };
    } catch {
      outcome = { kind: "lost" };
    }

    const rb = await this.readBack(id);

    if (rb !== "unavailable" && rb.data) {
      if (rowMatches(row, rb.data)) return this.result("CONFIRMED", id, `readback_match_after_${outcome.kind}`);
      return this.result("BLOCKED", id, "readback_mismatch");
    }

    if (rb === "unavailable") {
      if (outcome.kind === "auth") return this.result("FAILED", id, `auth_refused_${outcome.code}`);
      return this.result("UNKNOWN", id, `readback_unavailable_after_${outcome.kind}`);
    }

    switch (outcome.kind) {
      case "duplicate":
        return this.result("BLOCKED", id, "duplicate_not_visible");
      case "auth":
        return this.result("FAILED", id, `auth_refused_${outcome.code}`);
      case "rejected":
        return this.result("FAILED", id, `rejected_${outcome.code}`);
      case "ok":
        return this.result("UNKNOWN", id, "insert_ok_but_not_visible");
      case "lost":
        return this.result("UNKNOWN", id, "lost_and_absent");
    }
  }
}
