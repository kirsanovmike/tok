/**
 * Диагностика блоков, которые диспетчер показать не смог.
 *
 * Вынесено из диспетчера, чтобы «сколько раз ругаться» решалось в одном месте:
 * `contents[]` пересчитывается на каждое изменение ленты, и наивный `console.warn`
 * в вычисляемом свойстве залил бы консоль разработчика Трансферы.
 *
 * Причин ровно две, и они не одно и то же:
 *   — бэк прислал тип, которого нет в контракте, — сообщаем как о неизвестном;
 *   — тип в контракте есть, а рендерера под него ещё нет, — это наш пробел,
 *     и формулировка не должна валить его на бэк.
 */
import { isKnownContentType } from '../../api/contract';

export const CONTENT_WARNING_PREFIX = '[Ток]';

const reported = Object.create(null);

/** Один тип — одно предупреждение за жизнь страницы. Вернёт `true`, если ругнулись. */
export function warnMissingRenderer(type) {
  const key = String(type);
  if (reported[key]) return false;
  reported[key] = true;

  const reason = isKnownContentType(key)
    ? `для блока «${key}» нет рендерера`
    : `неизвестный тип блока ответа «${key}»`;

  // eslint-disable-next-line no-console
  console.warn(`${CONTENT_WARNING_PREFIX} ${reason}. Блок пропущен, остальной ответ показан.`);
  return true;
}

/** Только для тестов: сбросить память о том, о чём уже предупреждали. */
export function resetMissingRendererWarnings() {
  Object.keys(reported).forEach((key) => {
    delete reported[key];
  });
}
