import { describe, expect, it } from 'vitest';
import { assessVmaReference, getVmaReference, vmaReferencePosition } from '../vmaReference';
import { getVmaTargetByAmbition } from '@/lib/physiologicalTargets';

describe('VMA reference scenarios — display only', () => {
  it('shares the same local VMA position between radar and gauge without changing prescription', () => {
    const ref = getVmaReference('IM', 'competitor');
    expect(vmaReferencePosition(13, ref)).toBeCloseTo(90.2778, 3);
    expect(vmaReferencePosition(18, ref)).toBe(100);
    expect(vmaReferencePosition(null, ref)).toBeNull();
    expect(getVmaTargetByAmbition('IM', 'competitor')).toBeNull();
  });
  it('flags a potential limiter below the ambition reference and quantifies the gap', () => {
    expect(assessVmaReference(13, getVmaReference('IM', 'competitor'))).toMatchObject({ status: 'below', gapKmh: 1.4 });
  });
  it.each([14.4, 15, 16.5])('does not flag a VMA deficit inside the reference, including boundaries %s', value => {
    expect(assessVmaReference(value, getVmaReference('IM', 'competitor'))).toMatchObject({ status: 'inside', gapKmh: 0 });
  });
  it('does not penalize a VMA above the reference', () => {
    expect(assessVmaReference(18, getVmaReference('IM', 'competitor'))).toMatchObject({ status: 'above', gapKmh: 0 });
  });
  it.each([null, 0, -1, NaN, Infinity])('never classifies missing or invalid VMA %s as a deficit', value => {
    expect(assessVmaReference(value, getVmaReference('IM', 'competitor'))).toMatchObject({ status: 'unavailable', gapKmh: null });
  });
  it('reassesses the same profile when ambition changes', () => {
    expect(assessVmaReference(13, getVmaReference('IM', 'finisher')).status).toBe('inside');
    expect(assessVmaReference(13, getVmaReference('IM', 'competitor')).status).toBe('below');
  });
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