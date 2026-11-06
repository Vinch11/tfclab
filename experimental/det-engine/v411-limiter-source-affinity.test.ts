import { describe,expect,it } from 'vitest';
import { limiterSourceAffinity } from './v411-limiter-source-affinity';
const threshold=(sport:string)=>({primaryDomain:'mlss',limiterKeys:['threshold_tolerance',sport]});
describe('search affinity retains the meaning and discipline of the raw limiter',()=>{
 it('does not credit a running or swimming threshold lead to FTP',()=>{
  expect(limiterSourceAffinity(threshold('cycling_power_durability'),'ftp')).toBe(true);
  expect(limiterSourceAffinity(threshold('running_impact_tolerance'),'ftp')).toBe(false);
  expect(limiterSourceAffinity(threshold('swim_technical_durability'),'ftp_relative')).toBe(false);
 });
 it('keeps CSS in swimming',()=>{
  expect(limiterSourceAffinity(threshold('swim_technical_durability'),'css_threshold')).toBe(true);
  expect(limiterSourceAffinity(threshold('cycling_power_durability'),'css_threshold')).toBe(false);
 });
 it('keeps the VMA velocity lead in running',()=>{
  const keys=['aerobic_ceiling','severe_domain_tolerance'];
  expect(limiterSourceAffinity({primaryDomain:'vo2max',limiterKeys:[...keys,'running_impact_tolerance']},'vma_velocity')).toBe(true);
  expect(limiterSourceAffinity({primaryDomain:'vo2max',limiterKeys:[...keys,'cycling_power_durability']},'vma_velocity')).toBe(false);
 });
 it('does not convert missing definitions into a substitute limiter',()=>{
  expect(limiterSourceAffinity(threshold('running_impact_tolerance'),null)).toBe(false);
 });
});
