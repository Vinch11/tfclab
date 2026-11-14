import { assertEquals } from 'jsr:@std/assert@1';
import { summarizeStreamsByMinute } from './streamSummary.ts';

Deno.test('La durabilité reçoit une moyenne par minute et non un point par seconde', () => {
  const time = Array.from({ length: 180 }, (_, second) => second);
  const watts = time.map(second => second < 60 ? 200 : second < 120 ? 220 : null);
  const speed = time.map(second => second < 120 ? second : null);
  const result = summarizeStreamsByMinute({ stream_time: time, stream_watts: watts, stream_speed: speed });

  assertEquals(result.stream_time, [30, 90, 150]);
  assertEquals(result.stream_watts, [200, 220, null]);
  assertEquals(result.stream_speed, [29.5, 89.5, null]);
  assertEquals(result.stream_time.length, 3);
});

Deno.test('Trois heures seconde par seconde deviennent 180 moyennes', () => {
  const time = Array.from({ length: 3 * 60 * 60 }, (_, second) => second);
  const result = summarizeStreamsByMinute({ stream_time: time, stream_watts: time.map(() => 180) });
  assertEquals(result.stream_time.length, 180);
  assertEquals(result.stream_watts.every(value => value === 180), true);
});
