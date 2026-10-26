/** IDs exactly as published in catalogue rows: preserve case, never infer an ID from prose. */
export function extractCatalogIdsFromDump(dump: string | null | undefined): string[] {
 if (!dump) return [];
 const ids=new Set<string>();
 for (const line of dump.split("\n")) {
  const match=line.match(/^\|\s*([A-Za-z][A-Za-z0-9_-]*)\s*\|/);
  if(match && match[1].toUpperCase()!=="ID") ids.add(match[1]);
 }
 return [...ids];
}
