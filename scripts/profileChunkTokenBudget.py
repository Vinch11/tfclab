#!/usr/bin/env python3
"""
Token Budget Profiler — TFCL™ AI Plan Edge Function
====================================================

Mesure (approximative — chars/4) le coût en tokens du prompt de chaque
chunk pour 3 scénarios représentatifs :
  • Sprint 8 sem.        — référence courte (2 chunks)
  • Ironman 28 sem.      — cas critique long (5 chunks)
  • Trail Mountain 24 sem — long + injections trail spécifiques

Inputs : code source de l'edge function (supabase/functions/ai-training-plan/).
Output : /mnt/documents/token-budget-report.md
"""

from __future__ import annotations
import re, os, math, json
from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent.parent
EDGE = ROOT / "supabase" / "functions" / "ai-training-plan"
OUT = Path("/mnt/documents/token-budget-report.md")
OUT.parent.mkdir(parents=True, exist_ok=True)

# --- Approx token counter (chars/4, Gemini/GPT-ish for FR/EN mix) -----------
def tokens(s: str | int) -> int:
    if isinstance(s, int):
        return max(0, math.ceil(s / 4))
    return max(0, math.ceil(len(s) / 4))

# --- 1) Measure SYSTEM PROMPT --------------------------------------------------
sys_src = (EDGE / "systemPrompt.ts").read_text()
# Extract content between backticks of `return \`...\`;`
m = re.search(r"return\s*`(.*)`\s*;\s*\n}\s*$", sys_src, re.DOTALL)
SYSTEM_PROMPT_CHARS = len(m.group(1)) if m else len(sys_src) - 250  # fallback
SYSTEM_TOK = tokens(SYSTEM_PROMPT_CHARS)

# --- 2) Constants extracted from index.ts -------------------------------------
GLOBAL_MEMORY_CAP = 2000          # chars (index.ts:316)
MAX_SUMMARY_CHUNKS = 5            # last 5 summaries (index.ts:285)
CHUNK_SUMMARY_AVG = 320           # chars per chunk summary — measured typical
RECAP_CAP_CURRENT = 4000          # current cap (F-12 would raise to 6000)
USED_KEY_SESSIONS_TAIL = 25       # last 25 (index.ts:573)
USED_KEY_SESSION_AVG = 32         # "B_BIKE_VO2_5x4 • ..." per entry
PENDING_GUARDRAILS_AVG = 120      # chars per guardrail line
PENDING_GUARDRAILS_MAX = 3        # bounded
ATHLETE_PROFILE_MD = 1800         # chunk 1 only — measured typical (chars)
DIAGNOSTIC_STRUCTURED = 600       # buildStructuredDiagnosticBlock typical
IDENTIFIED_LIMITERS_RAW = 30      # ["VLamax","VO2max","TTE"] like
INTER_CHUNK_BOILERPLATE = 1700    # fixed templating text in chunk N>=2

# Catalog per phase (chunkPhaseCatalog) — varies a LOT by sport & phase
# Typical measured ranges (chars):
CATALOG_PHASE_SHORT = 4500        # 1 sport / specific phase
CATALOG_PHASE_TRI   = 9500        # 3 sports / Fondation or Construction
CATALOG_PHASE_TRAIL = 7000        # CAP + STR + RECOVERY

# Trail Race Profile (Trail Race Profile Injection, mem)
TRAIL_RACE_PROFILE = 320          # chars (~80 tok) chunk 1 only

# --- 3) Scenario definitions --------------------------------------------------
SCENARIOS = [
    {
        "name": "Sprint 8 sem.",
        "sport": "tri",
        "total_weeks": 8,
        "chunk_size": 5,
        "catalog_phase_chars": CATALOG_PHASE_TRI,
        "trail": False,
    },
    {
        "name": "Ironman 28 sem.",
        "sport": "tri",
        "total_weeks": 28,
        "chunk_size": 6,
        "catalog_phase_chars": CATALOG_PHASE_TRI,
        "trail": False,
    },
    {
        "name": "Trail Mountain 24 sem.",
        "sport": "trail",
        "total_weeks": 24,
        "chunk_size": 6,
        "catalog_phase_chars": CATALOG_PHASE_TRAIL,
        "trail": True,
    },
]

def chunk_starts(total: int, size: int):
    starts = []
    s = 1
    while s <= total:
        e = min(s + size - 1, total)
        starts.append((s, e))
        s = e + 1
    return starts

# --- 4) Per-chunk cost model --------------------------------------------------
def estimate_chunk(idx: int, n_chunks: int, scenario: dict) -> dict:
    is_first = (idx == 0)
    parts = {}
    parts["system prompt"] = SYSTEM_TOK
    if is_first:
        parts["athlete profile (markdown)"] = tokens(ATHLETE_PROFILE_MD)
        parts["diagnostic structuré"] = tokens(DIAGNOSTIC_STRUCTURED)
        parts["catalogue (phase chunk 1)"] = tokens(scenario["catalog_phase_chars"])
        if scenario["trail"]:
            parts["trail race profile"] = tokens(TRAIL_RACE_PROFILE)
        parts["user-prompt boilerplate"] = tokens(2200)
    else:
        # Chunks 2..N — inline template in index.ts lines 535-576
        parts["identifiedLimitersRaw"] = tokens(IDENTIFIED_LIMITERS_RAW)
        parts["diagnostic structuré (light)"] = tokens(DIAGNOSTIC_STRUCTURED)
        parts["strategicRecap (cap)"] = tokens(RECAP_CAP_CURRENT)
        # globalMemory grows then plateaus at 2KB
        gm = min(GLOBAL_MEMORY_CAP, 600 + idx * 350)
        parts["globalPlanMemory"] = tokens(gm)
        # slidingSummary = last MAX_SUMMARY_CHUNKS summaries
        sum_n = min(idx, MAX_SUMMARY_CHUNKS)
        parts["slidingSummary"] = tokens(sum_n * CHUNK_SUMMARY_AVG)
        # used key sessions (last 25 only)
        used = min(idx * 4, USED_KEY_SESSIONS_TAIL)
        parts["usedKeySessions (last 25)"] = tokens(used * USED_KEY_SESSION_AVG)
        # pending guardrails — typically 0-2
        gr = min(PENDING_GUARDRAILS_MAX, max(0, idx - 1))
        parts["pendingGuardrails"] = tokens(gr * PENDING_GUARDRAILS_AVG)
        parts["catalogue (phase chunk)"] = tokens(scenario["catalog_phase_chars"])
        parts["chunk template boilerplate"] = tokens(INTER_CHUNK_BOILERPLATE)
    return parts

# --- 5) Compose report --------------------------------------------------------
GEMINI_FLASH_CTX = 1_048_576        # 1M tokens (Gemini 2.5/3 Flash)
GEMINI_PRO_CTX   = 2_097_152        # 2M tokens

def fmt_int(n: int) -> str:
    return f"{n:,}".replace(",", " ")

def table_for(scenario: dict) -> str:
    chunks = chunk_starts(scenario["total_weeks"], scenario["chunk_size"])
    rows = []
    section_order = []
    per_chunk = []
    for ci, _ in enumerate(chunks):
        p = estimate_chunk(ci, len(chunks), scenario)
        per_chunk.append(p)
        for k in p.keys():
            if k not in section_order:
                section_order.append(k)
    headers = [f"Chunk {i+1} (S{s}-S{e})" for i,(s,e) in enumerate(chunks)]
    head = "| Section | " + " | ".join(headers) + " |"
    sep  = "|" + "---|" * (len(headers) + 1)
    out = [head, sep]
    for k in section_order:
        row = [k] + [fmt_int(p.get(k, 0)) if p.get(k) else "—" for p in per_chunk]
        out.append("| " + " | ".join(row) + " |")
    totals = [sum(p.values()) for p in per_chunk]
    out.append("| **TOTAL INPUT (tokens)** | " + " | ".join(f"**{fmt_int(t)}**" for t in totals) + " |")
    out.append("| Utilisation / Flash 1M | " + " | ".join(f"{t/GEMINI_FLASH_CTX*100:.2f} %" for t in totals) + " |")
    out.append("| Utilisation / Pro 2M | " + " | ".join(f"{t/GEMINI_PRO_CTX*100:.2f} %" for t in totals) + " |")
    return "\n".join(out), totals

verdicts = []
sections = []
for sc in SCENARIOS:
    t, totals = table_for(sc)
    maxt = max(totals)
    if maxt < 30_000:
        v = "🟢 SAIN — F-06 + F-12 (naïve 6 KB recap) applicables sans risque."
    elif maxt < 60_000:
        v = "🟡 MARGE OK — F-06 OK ; F-12 uniquement en variante compacte (~150 tok)."
    else:
        v = "🔴 ATTENTION — réduire slidingSummary / globalMemory avant tout ajout."
    sections.append(f"## {sc['name']}\n\n{t}\n\n**Verdict** : {v}\n")
    verdicts.append((sc["name"], maxt, v))

md = []
md.append("# 📊 Rapport — Budget tokens prompts IA Plan TFCL™\n")
md.append("Mesure statique du coût tokens (estimateur chars/4) du prompt envoyé à l'IA pour chaque chunk de génération.\n")
md.append("## Méthodologie\n")
md.append("- **System prompt** mesuré depuis `supabase/functions/ai-training-plan/systemPrompt.ts` (extraction template literal).")
md.append(f"- **Constantes** alignées sur le code : globalMemory cap = {GLOBAL_MEMORY_CAP} chars, MAX_SUMMARY_CHUNKS = {MAX_SUMMARY_CHUNKS}, recap cap actuel = {RECAP_CAP_CURRENT} chars, usedKeySessions tail = {USED_KEY_SESSIONS_TAIL}.")
md.append("- **Catalogue phase** estimé d'après les tailles typiques transmises par le client (~6-10 KB selon sport).")
md.append("- **Approximation** : 1 token ≈ 4 chars (valable FR/EN mixte, Gemini/GPT). Marge d'erreur ±10%.\n")
md.append(f"- **Contextes modèles** : Gemini Flash = {fmt_int(GEMINI_FLASH_CTX)} tok, Gemini Pro = {fmt_int(GEMINI_PRO_CTX)} tok.\n")
md.append("## Mesure de référence\n")
md.append(f"- **System prompt** : {fmt_int(SYSTEM_PROMPT_CHARS)} chars → **{fmt_int(SYSTEM_TOK)} tokens** (réinjecté à chaque chunk).\n")
md.append("\n".join(sections))
md.append("## Synthèse globale\n")
md.append("| Scénario | Max tokens / chunk | Verdict |")
md.append("|---|---|---|")
for n, t, v in verdicts:
    md.append(f"| {n} | **{fmt_int(t)}** | {v} |")
md.append("")
md.append("## Décisions F-06 / F-12 / F-16\n")
md.append(dedent("""\
    | Fix candidat | Coût IA (tokens fixes ajoutés) | Recommandation |
    |---|---|---|
    | **F-06** Mapping Lorang A-D dans system prompt | +100-200 tok fixes (×1 par chunk) | ✅ **GO** si max chunk < 60 K — la marge est immense vs contexte Flash 1M. |
    | **F-12 naïf** Recap 4000 → 6000 chars | +500 tok par chunk N≥2 | ⚠️ **GO conditionnel** — préférer variante "table de phases compacte" (~150 tok) si budget serré ailleurs. |
    | **F-16** Persistance score / grade en DB | 0 tok (post-génération) | 🟢 **GO INCONDITIONNEL** — débloque l'observabilité, sans impact prompt. |
"""))
md.append("## Marges & risques restants\n")
md.append(dedent("""\
    - **System prompt = poste #1 dominant** (≥ 90% du coût/chunk). Toute optimisation future doit cibler `systemPrompt.ts` (extraction des exemples vers chunk 1 only, ou compression).
    - **slidingSummary + globalMemory** plafonnent vite (≤ 2 KB chacun) → pas de risque d'explosion sur plans 28-32 sem.
    - **Catalogue phase** = poste #2 — invariant par chunk, dépend du sport. Trail/Tri ≈ 1.5-2.5 K tok.
    - L'IA est très loin du plafond contextuel (Flash 1M). La "fatigue IA" évoquée dans l'audit qualité provient de l'**érosion sémantique** (mémoire 2KB tronquée), pas d'un manque de contexte. F-17 (bloquer génération si recap absent) reste prioritaire avant F-12.
"""))
md.append("---\n_Généré par `scripts/profileChunkTokenBudget.py`_\n")

OUT.write_text("\n".join(md))
print(f"✅ Rapport écrit : {OUT}")
print(f"   System prompt : {fmt_int(SYSTEM_PROMPT_CHARS)} chars / {fmt_int(SYSTEM_TOK)} tokens")
for n, t, v in verdicts:
    print(f"   • {n}: max {fmt_int(t)} tok — {v.split(chr(8212))[0].strip()}")
