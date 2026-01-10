// =============================================
// PDF Layout-Aware Text Extraction
// Uses x,y coordinates to reconstruct lines and detect tables
// =============================================

import * as pdfjsLib from "pdfjs-dist";
import { logDebug } from "./normalize";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// =============================================
// Types
// =============================================

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
}

export interface PageItems {
  pageNum: number;
  items: TextItem[];
  width: number;
  height: number;
}

export interface ReconstructedLine {
  y: number;
  text: string;
  items: TextItem[];
  pageNum: number;
}

export interface TableCell {
  value: string;
  numericValue: number | null;
  x: number;
  width: number;
  confidence: number; // 0-1
}

export interface TableRow {
  cells: TableCell[];
  y: number;
  lineText: string;
}

export interface DetectedTable {
  headerRow: TableRow | null;
  dataRows: TableRow[];
  columns: {
    name: string;
    xMin: number;
    xMax: number;
    type: "watts" | "hr" | "lactate" | "cadence" | "glycemia" | "percent" | "other";
  }[];
  confidence: number;
  pageNum: number;
}

export interface LayoutExtractionResult {
  pageItems: PageItems[];
  linesByPage: ReconstructedLine[][];
  tables: DetectedTable[];
  fullText: string;
  totalPages: number;
}

// =============================================
// Text Item Extraction with Coordinates
// =============================================

/**
 * Extract text items with x,y coordinates from PDF
 */
export async function extractTextItemsByPage(file: File): Promise<PageItems[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const pageItems: PageItems[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    
    const items: TextItem[] = [];
    
    for (const item of textContent.items) {
      if ("str" in item && item.str.trim()) {
        const textItem = item as { 
          str: string; 
          transform: number[]; 
          width: number; 
          height: number;
          fontName: string;
        };
        
        // transform[4] = x, transform[5] = y (from bottom)
        // Convert y to top-origin
        const x = Math.round(textItem.transform[4] * 100) / 100;
        const yFromBottom = textItem.transform[5];
        const y = Math.round((viewport.height - yFromBottom) * 100) / 100;
        
        items.push({
          str: textItem.str,
          x,
          y,
          width: textItem.width || 0,
          height: textItem.height || 10,
          fontName: textItem.fontName || "",
        });
      }
    }
    
    pageItems.push({
      pageNum,
      items,
      width: viewport.width,
      height: viewport.height,
    });
  }
  
  return pageItems;
}

// =============================================
// Line Reconstruction
// =============================================

const Y_TOLERANCE = 3; // pixels tolerance for same line
const X_GAP_THRESHOLD = 8; // pixels gap to add space

/**
 * Group text items by Y position to reconstruct lines
 */
export function buildLines(pageItems: PageItems): ReconstructedLine[] {
  const { items, pageNum } = pageItems;
  
  if (items.length === 0) return [];
  
  // Sort by Y first (top to bottom), then by X (left to right)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= Y_TOLERANCE) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });
  
  const lines: ReconstructedLine[] = [];
  let currentLine: TextItem[] = [];
  let currentY = sorted[0]?.y ?? 0;
  
  for (const item of sorted) {
    if (Math.abs(item.y - currentY) > Y_TOLERANCE) {
      // New line
      if (currentLine.length > 0) {
        lines.push(buildLineFromItems(currentLine, currentY, pageNum));
      }
      currentLine = [item];
      currentY = item.y;
    } else {
      currentLine.push(item);
    }
  }
  
  // Don't forget last line
  if (currentLine.length > 0) {
    lines.push(buildLineFromItems(currentLine, currentY, pageNum));
  }
  
  return lines;
}

/**
 * Build a line from items, adding spaces where needed
 */
function buildLineFromItems(items: TextItem[], y: number, pageNum: number): ReconstructedLine {
  // Sort by X position
  const sorted = [...items].sort((a, b) => a.x - b.x);
  
  let text = "";
  let lastX = 0;
  let lastWidth = 0;
  
  for (const item of sorted) {
    const gap = item.x - (lastX + lastWidth);
    
    if (text.length > 0) {
      // Add space if significant gap
      if (gap > X_GAP_THRESHOLD) {
        text += "  "; // Double space for clear column separation
      } else if (gap > 2) {
        text += " ";
      }
    }
    
    text += item.str;
    lastX = item.x;
    lastWidth = item.width;
  }
  
  return {
    y,
    text: text.trim(),
    items: sorted,
    pageNum,
  };
}

// =============================================
// Table Detection & Extraction
// =============================================

const TABLE_HEADER_KEYWORDS = [
  { pattern: /\bW\b|Watts?|Puissance/i, type: "watts" as const },
  { pattern: /\bFC\b|HR|bpm|Fréquence/i, type: "hr" as const },
  { pattern: /Lactate|La\b|mmol/i, type: "lactate" as const },
  { pattern: /Cadence|rpm|RPM/i, type: "cadence" as const },
  { pattern: /Glyc[ée]mie|mg\/d[lL]|Glucose/i, type: "glycemia" as const },
  { pattern: /%|Pourcent/i, type: "percent" as const },
];

/**
 * Detect tables in reconstructed lines
 */
export function buildTableCandidates(linesByPage: ReconstructedLine[][]): DetectedTable[] {
  const tables: DetectedTable[] = [];
  
  for (const pageLines of linesByPage) {
    if (pageLines.length === 0) continue;
    
    const pageNum = pageLines[0].pageNum;
    
    // Find potential table headers
    for (let i = 0; i < pageLines.length; i++) {
      const line = pageLines[i];
      const headerColumns = detectHeaderColumns(line);
      
      if (headerColumns.length >= 2) {
        // Found potential header, extract table
        const table = extractTableFromHeader(pageLines, i, headerColumns, pageNum);
        if (table && table.dataRows.length >= 2) {
          tables.push(table);
          logDebug({
            type: "info",
            field: "table_detection",
            message: `Found table with ${table.dataRows.length} rows, ${table.columns.length} columns`,
            value: table.confidence,
          });
        }
      }
    }
  }
  
  return tables;
}

/**
 * Detect column headers in a line
 */
function detectHeaderColumns(line: ReconstructedLine): { name: string; x: number; width: number; type: string }[] {
  const columns: { name: string; x: number; width: number; type: string }[] = [];
  
  for (const item of line.items) {
    for (const kw of TABLE_HEADER_KEYWORDS) {
      if (kw.pattern.test(item.str)) {
        columns.push({
          name: item.str,
          x: item.x,
          width: item.width || 50,
          type: kw.type,
        });
        break;
      }
    }
  }
  
  // Also check for "Palier" / "Stage" column
  for (const item of line.items) {
    if (/Palier|Stage|[ÉE]tape|N°/i.test(item.str)) {
      columns.unshift({
        name: item.str,
        x: item.x,
        width: item.width || 50,
        type: "other",
      });
    }
  }
  
  return columns;
}

/**
 * Extract table data starting from header line
 */
function extractTableFromHeader(
  lines: ReconstructedLine[],
  headerIndex: number,
  headerColumns: { name: string; x: number; width: number; type: string }[],
  pageNum: number
): DetectedTable | null {
  // Build column boundaries
  const columns = headerColumns.map((col, idx) => {
    const nextCol = headerColumns[idx + 1];
    return {
      name: col.name,
      xMin: col.x - 10,
      xMax: nextCol ? nextCol.x - 5 : col.x + 200,
      type: col.type as DetectedTable["columns"][0]["type"],
    };
  });
  
  const dataRows: TableRow[] = [];
  let consecutiveEmptyRows = 0;
  
  // Process lines after header
  for (let i = headerIndex + 1; i < lines.length && consecutiveEmptyRows < 2; i++) {
    const line = lines[i];
    
    // Skip if it looks like a section break
    if (/(?:Résumé|Synthèse|Conclusion|Recommandation|Note)/i.test(line.text)) {
      break;
    }
    
    // Try to extract cells for this row
    const row = extractRowCells(line, columns);
    
    if (row.cells.some(c => c.numericValue !== null)) {
      dataRows.push(row);
      consecutiveEmptyRows = 0;
    } else if (line.text.trim().length > 0) {
      consecutiveEmptyRows++;
    }
  }
  
  if (dataRows.length < 2) return null;
  
  // Calculate confidence based on how many cells have valid values
  const totalCells = dataRows.length * columns.length;
  const validCells = dataRows.reduce(
    (sum, row) => sum + row.cells.filter(c => c.numericValue !== null).length,
    0
  );
  const confidence = validCells / totalCells;
  
  return {
    headerRow: {
      cells: columns.map(c => ({
        value: c.name,
        numericValue: null,
        x: c.xMin,
        width: c.xMax - c.xMin,
        confidence: 1,
      })),
      y: lines[headerIndex].y,
      lineText: lines[headerIndex].text,
    },
    dataRows,
    columns,
    confidence,
    pageNum,
  };
}

/**
 * Extract cells from a line based on column boundaries
 */
function extractRowCells(
  line: ReconstructedLine,
  columns: DetectedTable["columns"]
): TableRow {
  const cells: TableCell[] = columns.map(col => ({
    value: "",
    numericValue: null,
    x: col.xMin,
    width: col.xMax - col.xMin,
    confidence: 0,
  }));
  
  // Assign items to columns based on x position
  for (const item of line.items) {
    const centerX = item.x + (item.width / 2);
    
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (centerX >= col.xMin && centerX < col.xMax) {
        // This item belongs to this column
        if (cells[i].value) cells[i].value += " ";
        cells[i].value += item.str;
        break;
      }
    }
  }
  
  // Parse numeric values and validate by column type
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const colType = columns[i].type;
    
    // Normalize FR numbers
    const normalized = cell.value.replace(/,/g, ".").replace(/\s+/g, "");
    const numMatch = normalized.match(/-?\d+\.?\d*/);
    
    if (numMatch) {
      const num = parseFloat(numMatch[0]);
      
      // Validate by expected ranges
      const validation = validateCellValue(num, colType);
      if (validation.valid) {
        cell.numericValue = num;
        cell.confidence = validation.confidence;
      } else {
        cell.confidence = 0.3; // Low confidence - outside expected range
      }
    }
  }
  
  return {
    cells,
    y: line.y,
    lineText: line.text,
  };
}

/**
 * Validate cell value based on expected column type
 */
function validateCellValue(value: number, type: string): { valid: boolean; confidence: number } {
  const ranges: Record<string, { min: number; max: number }> = {
    watts: { min: 50, max: 600 },
    hr: { min: 50, max: 220 },
    lactate: { min: 0.3, max: 25 },
    cadence: { min: 40, max: 140 },
    glycemia: { min: 40, max: 300 },
    percent: { min: 0, max: 100 },
  };
  
  const range = ranges[type];
  if (!range) return { valid: true, confidence: 0.5 };
  
  if (value >= range.min && value <= range.max) {
    return { valid: true, confidence: 0.9 };
  }
  
  // Slightly outside range
  const margin = (range.max - range.min) * 0.1;
  if (value >= range.min - margin && value <= range.max + margin) {
    return { valid: true, confidence: 0.6 };
  }
  
  return { valid: false, confidence: 0.2 };
}

// =============================================
// Main Extraction Function
// =============================================

/**
 * Full layout-aware extraction from PDF
 */
export async function extractLayoutFromPdf(file: File): Promise<LayoutExtractionResult> {
  // Step 1: Extract text items with coordinates
  const pageItems = await extractTextItemsByPage(file);
  
  // Step 2: Reconstruct lines per page
  const linesByPage: ReconstructedLine[][] = pageItems.map(buildLines);
  
  // Step 3: Build full text from lines
  const fullText = linesByPage
    .flat()
    .map(line => line.text)
    .join("\n");
  
  // Step 4: Detect tables
  const tables = buildTableCandidates(linesByPage);
  
  logDebug({
    type: "info",
    field: "layout_extraction",
    message: `Extracted ${linesByPage.flat().length} lines, ${tables.length} tables`,
  });
  
  return {
    pageItems,
    linesByPage,
    tables,
    fullText,
    totalPages: pageItems.length,
  };
}

// =============================================
// Utility: Find line containing pattern
// =============================================

export function findLineWithPattern(
  lines: ReconstructedLine[],
  pattern: RegExp
): ReconstructedLine | null {
  for (const line of lines) {
    if (pattern.test(line.text)) {
      return line;
    }
  }
  return null;
}

export function findLinesWithPattern(
  lines: ReconstructedLine[],
  pattern: RegExp
): ReconstructedLine[] {
  return lines.filter(line => pattern.test(line.text));
}

/**
 * Extract value from a line near an anchor pattern
 */
export function extractValueNearAnchor(
  lines: ReconstructedLine[],
  anchorPattern: RegExp,
  valuePattern: RegExp
): { value: number | null; line: ReconstructedLine | null; confidence: number } {
  const anchorLine = findLineWithPattern(lines, anchorPattern);
  
  if (!anchorLine) {
    return { value: null, line: null, confidence: 0 };
  }
  
  // First try on the same line
  const sameLineMatch = anchorLine.text.match(valuePattern);
  if (sameLineMatch) {
    const numStr = sameLineMatch[1] || sameLineMatch[0];
    const num = parseFloat(numStr.replace(/,/g, "."));
    if (!isNaN(num)) {
      return { value: num, line: anchorLine, confidence: 0.9 };
    }
  }
  
  // Check 1-2 lines below
  const lineIndex = lines.indexOf(anchorLine);
  for (let i = 1; i <= 2 && lineIndex + i < lines.length; i++) {
    const nextLine = lines[lineIndex + i];
    const nextMatch = nextLine.text.match(valuePattern);
    if (nextMatch) {
      const numStr = nextMatch[1] || nextMatch[0];
      const num = parseFloat(numStr.replace(/,/g, "."));
      if (!isNaN(num)) {
        return { value: num, line: nextLine, confidence: 0.7 };
      }
    }
  }
  
  return { value: null, line: anchorLine, confidence: 0.3 };
}
