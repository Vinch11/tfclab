/**
 * Drift Ratio Chart
 * Displays the evolution of Pa:HR ratio over time with segment highlighting
 */

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import type { FitSession } from "@/lib/fitImport/types";

interface DriftRatioChartProps {
  session: FitSession;
  segmentRange: [number, number]; // [startPct, endPct]
  showSegmentHighlight?: boolean;
}

interface ChartDataPoint {
  timeMin: number;
  power: number | null;
  hr: number | null;
  ratio: number | null;
  inSegment: boolean;
}

// Rolling average helper
function rollingAverage(
  values: (number | null)[],
  windowSize: number
): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(values.length, i + Math.ceil(windowSize / 2));
    const window = values.slice(start, end).filter((v) => v !== null) as number[];
    if (window.length > 0) {
      result.push(window.reduce((a, b) => a + b, 0) / window.length);
    } else {
      result.push(null);
    }
  }
  return result;
}

export function DriftRatioChart({
  session,
  segmentRange,
  showSegmentHighlight = true,
}: DriftRatioChartProps) {
  const chartData = useMemo(() => {
    const records = session.records;
    if (records.length === 0) return [];

    const startTime = records[0]?.timestamp.getTime() ?? 0;
    const totalRecords = records.length;
    
    // Sample data to ~200 points for performance
    const sampleRate = Math.max(1, Math.floor(totalRecords / 200));
    const sampledRecords = records.filter((_, i) => i % sampleRate === 0);

    // Calculate raw ratios
    const rawData = sampledRecords.map((record, idx) => {
      const timeMin =
        (record.timestamp.getTime() - startTime) / 1000 / 60;
      const power = record.powerW ?? null;
      const hr = record.heartRate ?? null;
      const ratio = power !== null && hr !== null && hr > 0 ? power / hr : null;

      // Determine if this point is in the selected segment
      const pctPosition = (idx * sampleRate) / totalRecords * 100;
      const inSegment =
        pctPosition >= segmentRange[0] && pctPosition <= segmentRange[1];

      return { timeMin, power, hr, ratio, inSegment };
    });

    // Apply rolling average to smooth the ratio
    const ratios = rawData.map((d) => d.ratio);
    const smoothedRatios = rollingAverage(ratios, 5);

    return rawData.map((d, i) => ({
      ...d,
      ratioSmooth: smoothedRatios[i],
    }));
  }, [session, segmentRange]);

  // Calculate segment time boundaries
  const segmentTimes = useMemo(() => {
    if (chartData.length === 0) return { start: 0, end: 0 };
    const totalTime = chartData[chartData.length - 1]?.timeMin ?? 0;
    return {
      start: (totalTime * segmentRange[0]) / 100,
      end: (totalTime * segmentRange[1]) / 100,
    };
  }, [chartData, segmentRange]);

  // Calculate average ratio for reference line
  const avgRatio = useMemo(() => {
    const validRatios = chartData
      .filter((d) => d.inSegment && d.ratioSmooth !== null)
      .map((d) => d.ratioSmooth as number);
    if (validRatios.length === 0) return null;
    return validRatios.reduce((a, b) => a + b, 0) / validRatios.length;
  }, [chartData]);

  if (chartData.length < 10) {
    return (
      <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground bg-muted/30 rounded-lg">
        Données insuffisantes pour le graphique
      </div>
    );
  }

  const minRatio = Math.min(
    ...chartData.filter((d) => d.ratioSmooth !== null).map((d) => d.ratioSmooth as number)
  );
  const maxRatio = Math.max(
    ...chartData.filter((d) => d.ratioSmooth !== null).map((d) => d.ratioSmooth as number)
  );
  const yDomain = [
    Math.floor((minRatio - 0.1) * 10) / 10,
    Math.ceil((maxRatio + 0.1) * 10) / 10,
  ];

  return (
    <div className="h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
          
          {/* Segment highlight area */}
          {showSegmentHighlight && (
            <ReferenceArea
              x1={segmentTimes.start}
              x2={segmentTimes.end}
              fill="hsl(var(--primary))"
              fillOpacity={0.1}
              stroke="hsl(var(--primary))"
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />
          )}

          {/* Midpoint line of segment */}
          {showSegmentHighlight && (
            <ReferenceLine
              x={(segmentTimes.start + segmentTimes.end) / 2}
              stroke="hsl(var(--primary))"
              strokeDasharray="5 5"
              strokeOpacity={0.5}
            />
          )}

          {/* Average ratio line */}
          {avgRatio !== null && (
            <ReferenceLine
              y={avgRatio}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: `Moy: ${avgRatio.toFixed(2)}`,
                position: "right",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
          )}

          <XAxis
            dataKey="timeMin"
            tickFormatter={(v) => `${Math.round(v)}'`}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={yDomain}
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0]?.payload as ChartDataPoint & { ratioSmooth: number | null };
              if (!data) return null;
              return (
                <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs">
                  <p className="font-medium">
                    {data.timeMin.toFixed(1)} min
                    {data.inSegment && (
                      <span className="ml-1 text-primary">(segment)</span>
                    )}
                  </p>
                  {data.power !== null && (
                    <p className="text-blue-500">
                      Power: {Math.round(data.power)}W
                    </p>
                  )}
                  {data.hr !== null && (
                    <p className="text-red-500">FC: {Math.round(data.hr)}bpm</p>
                  )}
                  {data.ratioSmooth !== null && (
                    <p className="font-medium mt-1">
                      Ratio: {data.ratioSmooth.toFixed(2)} W/bpm
                    </p>
                  )}
                </div>
              );
            }}
          />

          {/* Power/HR ratio line */}
          <Line
            type="monotone"
            dataKey="ratioSmooth"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
