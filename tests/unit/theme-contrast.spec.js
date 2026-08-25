/**
 * Контраст цветов Тока по WCAG 2.1.
 *
 * Значения живут на стороне хоста (`src/demo/theme/tokTokens.js` — на стенде,
 * `@tne-ui/core` — в Трансфере): сами компоненты читают их как `var(--v-tok-*)`
 * и о числах не знают (ADR-0010).
 *
 * Проверка фазы 11 («контраст основного текста не ниже 4.5:1 в обеих темах»)
 * снималась в браузере, но браузерная проверка живёт ровно один прогон.
 * Здесь зафиксированы те пары «текст на фоне», которые реально встречаются
 * в разметке: правка токена, роняющая контраст, обязана падать тестом.
 *
 * Пары выписаны руками, а не выведены из CSS: связь «этот цвет лежит на этом
 * фоне» known только из компонентов, и подмена её эвристикой сделала бы тест
 * зелёным на неверных данных.
 */
import tokTokens from '@/demo/theme/tokTokens';

const AA_NORMAL = 4.5;
const AA_LARGE = 3;

function channel(value) {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * `[текст, фон, порог, где встречается]`.
 * Порог `AA_LARGE` — только для действительно крупного кегля (`stat`, 30px+).
 */
const PAIRS = [
  ['tok-text', 'tok-surface', AA_NORMAL, 'текст ответа на панели'],
  ['tok-text', 'tok-surface-muted', AA_NORMAL, 'пузырь пользователя, чипы-подсказки'],
  ['tok-text', 'tok-surface-elevated', AA_NORMAL, 'значения таблицы, stat'],
  ['tok-text-muted', 'tok-surface', AA_NORMAL, 'плейсхолдер, подписи под ответом'],
  ['tok-text-muted', 'tok-surface-muted', AA_NORMAL, 'неактивный переключатель графика'],
  ['tok-text-muted', 'tok-surface-elevated', AA_NORMAL, 'заголовки колонок таблицы, подпись stat'],
  ['tok-text-inverse', 'tok-accent', AA_NORMAL, '«Подтвердить», активный переключатель графика'],
  ['tok-text-inverse', 'tok-text', AA_NORMAL, 'кнопка остановки записи'],
  ['tok-danger', 'tok-surface', AA_NORMAL, 'текст сообщения об ошибке'],
  ['tok-danger', 'tok-surface-elevated', AA_NORMAL, 'ошибка внутри блока контента'],
  ['tok-accent', 'tok-surface', AA_LARGE, 'иконки и маркеры списка — графика, не текст'],
];

describe('контраст токенов Тока (WCAG 2.1 AA)', () => {
  ['light', 'dark'].forEach((mode) => {
    describe(mode, () => {
      it.each(PAIRS)('%s на %s — не ниже %s:1 (%s)', (fg, bg, threshold) => {
        const palette = tokTokens[mode];
        expect(palette[fg]).toBeDefined();
        expect(palette[bg]).toBeDefined();

        const ratio = contrast(palette[fg], palette[bg]);
        // Округление до сотых — как в отчётах инструментов проверки контраста.
        expect(Math.round(ratio * 100) / 100).toBeGreaterThanOrEqual(threshold);
      });
    });
  });

  // Статусные цвета изначально были одинаковыми в обеих палитрах — и именно
  // поэтому `danger` не проходил AA ни там, ни там. Инверсия обязана быть.
  it('danger различается между темами: в тёмной он светлее, чем в светлой', () => {
    expect(tokTokens.light['tok-danger']).not.toBe(tokTokens.dark['tok-danger']);
    expect(luminance(tokTokens.dark['tok-danger'])).toBeGreaterThan(
      luminance(tokTokens.light['tok-danger']),
    );
  });
});
