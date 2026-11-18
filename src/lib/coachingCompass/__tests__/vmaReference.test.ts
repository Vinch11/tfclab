import { describe, expect, it } from 'vitest';
import { getVmaReference } from '../vmaReference';
import { getVmaTargetByAmbition } from '@/lib/physiologicalTargets';

describe('VMA reference scenarios — display only', () => {
  it('calculates the competitor sensitivity range from the published marathon group', () => {
    expect(getVmaReference('Marathon', 'competitor')).toMatchObject({ low: 14.4, high: 16.5 });
  });
  it('changes the scenario with the selected ambition', () => {
    expect(getVmaReference('IM', 'finisher')).toMatchObject({ low: 12.2, high: 13.9 });
    expect(getVmaReference('IM', 'world_class')).toMatchObject({ low: 17.1, high: 20.3 });
  });
  it.each(['IM', 'Ironman', '703', '70.3', 'Half-Ironman'])('does not create a prescription target for %s', objective => {
    expect(getVmaReference(objective, 'competitor')).toMatchObject({ low: 14.4, high: 16.5 });
    expect(getVmaTargetByAmbition(objective, 'competitor')).toBeNull();
  });
  it.each(['5K', '10K', 'Semi', 'Marathon'])('supports a fresh running capacity context for %s', objective => {
    expect(getVmaReference(objective, 'age_group')).toMatchObject({ low: 15, high: 16.2 });
  });
  it.each(['Trail', 'TrailMountain', 'Cyclisme', 'unknown'])('does not transfer flat running references to %s', objective => {
    expect(getVmaReference(objective, 'competitor')).toBeNull();
  });
  it('never invents an ambition from missing or invalid context', () => {
    expect(getVmaReference('IM', '')).toBeNull();
    expect(getVmaReference('IM', 'invalid')).toBeNull();
  });
});