/**
 * Заплатки к jsdom для amCharts 4.
 *
 * jsdom реализует DOM, но SVG в нём урезан: нет конструктора `SVGPathElement`,
 * нет `getBBox`, `createSVGPoint` и `getScreenCTM` — всё, что требует настоящего
 * движка вёрстки. amCharts обращается к ним при построении графика и падает.
 *
 * Заплатки нужны **только тестам**: в браузере всё это есть, и в `src/tok/` ничего
 * подобного нет. Подключаются через `setupFiles` в `jest.config.js`.
 *
 * Осознанное ограничение: заплатки возвращают нули, поэтому проверить в jsdom
 * можно жизненный цикл графика (создание, перерисовку, утилизацию), но не его
 * геометрию. Внешний вид проверяется глазами на стенде.
 */

if (typeof window !== 'undefined') {
  if (typeof window.SVGPathElement === 'undefined') {
    // jsdom отдаёт для <path> обычный SVGElement, поэтому конструктор нужен только
    // ради `instanceof` внутри amCharts: проверка честно вернёт false.
    window.SVGPathElement = function SVGPathElement() {};
  }

  const proto = window.SVGElement && window.SVGElement.prototype;

  if (proto && !proto.getBBox) {
    proto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }

  if (proto && !proto.getScreenCTM) {
    proto.getScreenCTM = () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      inverse() {
        return this;
      },
      multiply() {
        return this;
      },
    });
  }

  if (proto && !proto.createSVGPoint) {
    proto.createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: 0, y: 0 };
      },
    });
  }

  if (proto && !proto.createSVGMatrix) {
    // Единичная матрица: amCharts перемножает её при пересчёте координат.
    proto.createSVGMatrix = () => ({
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      multiply() {
        return this;
      },
      inverse() {
        return this;
      },
      translate() {
        return this;
      },
      scale() {
        return this;
      },
      rotate() {
        return this;
      },
    });
  }

  if (proto && !proto.getComputedTextLength) {
    proto.getComputedTextLength = () => 0;
  }

  // amCharts измеряет контейнер перед отрисовкой; в jsdom метод отсутствует.
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = function ResizeObserver() {
      return { observe() {}, unobserve() {}, disconnect() {} };
    };
  }
}
