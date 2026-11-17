import {it,expect} from 'vitest';
import {planNutritionReferences} from '../planNutritionReferences';
it('does not infer running nutrition from bike VLamax',()=>{
 const refs=planNutritionReferences({weightKg:60,vo2max:50,vlamax:.4});
 expect(refs[0].status).toBe('to_test');
 expect(refs[1]).toEqual({sport:'run',status:'missing'});
});
it('never labels calculated nutrition as coach-validated tolerance',()=>{
 const refs=planNutritionReferences({weightKg:60,vo2max:50,vlamax:.4,vlamaxRun:.3});
 expect(refs.map(r=>r.status)).toEqual(['to_test','to_test']);
});