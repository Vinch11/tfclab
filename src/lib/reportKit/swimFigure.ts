import { chartFigure, pace } from './visualFigures';
import { sportPhoto } from './story';

export function swimFigure(css: number | null): string {
  const image = '<div class="chapter-image">' + sportPhoto('swim') + '</div>';
  if (!css || !Number.isFinite(css) || css <= 0)
    return image + '<p>Un test en bassin permettra de situer l’allure critique sur 100 mètres.</p>';
  const bars = [50, 100, 200, 400]
    .map(
      (m) =>
        `<div class="landmark"><div><b>${m} m</b><strong>${pace((css * m) / 100)}</strong></div><div class="landmark-rail"><i style="width:${m / 4}%"></i></div></div>`,
    )
    .join('');
  return (
    image +
    chartFigure(
      'Allure critique en bassin',
      bars,
      'À allure constante, ces temps sont équivalents sur quatre distances. Les répétitions et les récupérations dépendent de l’objectif de la séance.',
      'CSS du bilan · ' + pace(css) + ' min/100 m',
    )
  );
}
