import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { CalendarEntry } from './reportBrief';

/** Read every scheduled phase. Only the first three session titles appear in the reports. */
export async function readReportCalendar(athleteId: string): Promise<CalendarEntry[] | null> {
  const rows: (CalendarEntry & { workoutId: string | null })[] = [];
  const today = format(new Date(), 'yyyy-MM-dd');
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('training_plan').select('date,phase,custom_workout_title,workout_id')
      .eq('athlete_id', athleteId).gte('date', today).or('status.is.null,status.not.in.(COMPLETED,SKIPPED)')
      .order('date').order('id').range(offset, offset + pageSize - 1);
    if (error || !data) return null;
    rows.push(...data.map(row => ({ date: row.date, phase: row.phase, title: row.custom_workout_title?.trim() ?? '', workoutId: row.workout_id })));
    if (data.length < pageSize) break;
  }
  const ids = rows.slice(0, 3).flatMap(row => !row.title && row.workoutId ? [row.workoutId] : []);
  const { data } = ids.length ? await supabase.from('workouts_library').select('id,title').in('id', ids) : { data: [] };
  const titles = new Map<string, string>(data?.map(row => [row.id, row.title] as const));
  return rows.map(row => ({ date: row.date, phase: row.phase, title: row.title || titles.get(row.workoutId ?? '') || 'Séance planifiée' }));
}
