import { useState } from 'react';
import D1BlockPanel from '@/components/D1BlockPanel';
import { d1Fixture, d1Profiles } from '@/lib/plan/d1/fixtures';
export default function D1BlockHarness() {
  const [profile, setProfile] = useState(d1Profiles[0]);
  if (!import.meta.env.DEV || import.meta.env.VITE_TFCL_D1 !== 'true') return <p>D1 désactivé</p>;
  const fixture = d1Fixture(profile);
  return <main className="p-6"><h1>Recette D1 · profils synthétiques</h1>
    <label>Profil<select aria-label="Profil" value={profile} onChange={e => setProfile(e.target.value)}>
      {d1Profiles.map(p => <option key={p}>{p}</option>)}
    </select></label>
    <D1BlockPanel key={profile} {...fixture} />
  </main>;
}
