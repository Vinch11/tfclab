import {it,expect} from 'vitest';
import {normalizeIronmanPaceText} from '../ironmanPaceConsistency';
it('uses IM doctrine for the actual Ironman marathon rather than standalone marathon pace',()=>{
 expect(normalizeIronmanPaceText('42.195km à allure marathon IM en Z4a.')).toBe('42.195km à allure marathon IM en Z3.');
});
it('removes fixed VMA percentage from explicitly identified IM pace',()=>{
 expect(normalizeIronmanPaceText('12km à allure marathon IM (Z4a / 78-82% VMA)')).toBe('12km à allure marathon IM (Z3)');
});
it('does not downgrade a standalone marathon or unrelated threshold interval',()=>{
 const text='Séville : allure marathon Z4a ; marathon en gestion négative en Z4a ; vélo 2×20min Z4b';
 expect(normalizeIronmanPaceText(text)).toBe(text);
});