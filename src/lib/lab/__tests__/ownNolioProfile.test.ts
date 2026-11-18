import { describe, expect, it } from 'vitest';
import { withOwnNolioProfile, canReadTestSession } from '../../../../supabase/functions/nolio-v2-oauth/recordContract';

describe('Nolio own athlete profile', () => {
  const me = { id: 'usr_vincent', first_name: 'Vincent', last_name: 'Gillard' };
  it('includes the verified account owner even when absent from coached athletes', () => {
    expect(withOwnNolioProfile([{ id: 'usr_emanuela', has_api_access: true }], me)[0]).toEqual({ id: 'usr_vincent', name: 'Vincent Gillard', has_api_access: true, is_self: true });
  });
  it('does not duplicate the owner or expose profile email', () => {
    expect(withOwnNolioProfile([{ id: 'usr_vincent' }], { ...me, email: 'private@example.org' })).toEqual([{ id: 'usr_vincent', name: 'Vincent Gillard', has_api_access: true, is_self: true }]);
  });
  it('rejects malformed profile identities', () => {
    expect(withOwnNolioProfile([], { id: 123 })).toEqual([]);
    expect(withOwnNolioProfile([], null)).toEqual([]);
  });
  it('permits owner sessions only within a complete period and never another account', () => {
    const athletes = withOwnNolioProfile([], me);
    expect(canReadTestSession('usr_vincent', 'trn_test', athletes, [{ id: 'trn_test' }], true)).toBe(true);
    expect(canReadTestSession('usr_other', 'trn_test', athletes, [{ id: 'trn_test' }], true)).toBe(false);
    expect(canReadTestSession('usr_vincent', 'trn_test', athletes, [{ id: 'trn_test' }], false)).toBe(false);
  });
});