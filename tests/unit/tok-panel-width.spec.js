/**
 * Пункт 7 постановки «Доработки 3» — ширина шторки.
 *
 * jsdom не считает layout, поэтому арифметику перетаскивания проверяем на чистых
 * функциях, а поведение панели — в tok-shell.spec.js на подменённом innerWidth.
 */
import {
  PANEL_MIN_WIDTH,
  PANEL_RESIZE_MIN_VIEWPORT,
  PANEL_WIDTH_STEP,
  clampPanelWidth,
  isPanelResizable,
  panelMaxWidth,
  widthFromPointerX,
} from '@/Tok/services/utils/panelWidth';

describe('ширина шторки', () => {
  it('минимум — прежняя ширина плюс 40px', () => {
    expect(PANEL_MIN_WIDTH).toBe(520);
    expect(PANEL_WIDTH_STEP).toBe(24);
    expect(PANEL_RESIZE_MIN_VIEWPORT).toBe(600);
  });

  it('потолок — весь экран, но не уже минимума', () => {
    expect(panelMaxWidth(1440)).toBe(1440);
    // Окно уже минимума: потолок не имеет права оказаться ниже пола.
    expect(panelMaxWidth(400)).toBe(PANEL_MIN_WIDTH);
  });

  it('ширина зажата между минимумом и экраном и всегда целая', () => {
    expect(clampPanelWidth(300, 1440)).toBe(PANEL_MIN_WIDTH);
    expect(clampPanelWidth(900.4, 1440)).toBe(900);
    expect(clampPanelWidth(5000, 1440)).toBe(1440);
  });

  it('мусор вместо измерения не превращается в NaN-ширину', () => {
    expect(clampPanelWidth(undefined, 1440)).toBe(PANEL_MIN_WIDTH);
    expect(clampPanelWidth(NaN, 1440)).toBe(PANEL_MIN_WIDTH);
    expect(widthFromPointerX(undefined, 1440)).toBe(1440);
  });

  it('ширина считается от правого края окна: панель прижата к нему', () => {
    expect(widthFromPointerX(640, 1440)).toBe(800);
    // Указатель уехал за левый край — раскрываем во весь экран, а не в минус.
    expect(widthFromPointerX(-200, 1440)).toBe(1440);
    // Указатель у самого правого края — ниже минимума не схлопываемся.
    expect(widthFromPointerX(1430, 1440)).toBe(PANEL_MIN_WIDTH);
  });

  it('на узком окне тянуть нечего', () => {
    expect(isPanelResizable(1440)).toBe(true);
    expect(isPanelResizable(PANEL_RESIZE_MIN_VIEWPORT)).toBe(false);
    expect(isPanelResizable(320)).toBe(false);
    // Окна нет вовсе (SSR) — ручку не показываем.
    expect(isPanelResizable(undefined)).toBe(false);
  });
});
