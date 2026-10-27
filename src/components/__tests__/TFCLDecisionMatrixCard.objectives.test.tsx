import {it,expect} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {TFCLDecisionMatrixCard,TFCLDecisionMatrixCompact} from '../TFCLDecisionMatrixCard';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
it('both views explicitly report an unsupported complementary matrix without inventing a diagnosis',()=>{
 const fixture=preparePrevalidationFixture('B-5K');
 const input=fixture.decision.strategy._matrixInput!;
 render(<TFCLDecisionMatrixCard input={input}/>);
 expect(screen.getByRole('status')).toHaveTextContent('Matrice décisionnelle complémentaire non disponible');cleanup();
 render(<TFCLDecisionMatrixCompact input={input}/>);
 expect(screen.getByRole('status')).toHaveTextContent('classement unifié des limiteurs');
});
it('the 10 KM view computes the existing matrix without a render-time optimal exception',()=>{
 const fixture=preparePrevalidationFixture('B-10K');
 render(<TFCLDecisionMatrixCompact input={fixture.decision.strategy._matrixInput!}/>);
 expect(screen.queryByText(/non disponible/)).toBeNull();
 expect(screen.getByText('Décision TFCL')).toBeInTheDocument();
});
