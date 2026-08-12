/**
 * Копирование ответа в буфер обмена.
 *
 * `navigator.clipboard` есть не везде (http-стенды, старые браузеры Трансферы),
 * поэтому запасной путь — скрытое поле и `document.execCommand('copy')`.
 * Возвращаем `Promise<boolean>`: подпись «Скопировано» не должна показываться,
 * если скопировать не удалось.
 */

function fallbackCopy(value) {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;

  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', 'readonly');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();

  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }

  document.body.removeChild(area);
  return ok;
}

export function copyText(text) {
  const value = String(text || '');
  if (!value) return Promise.resolve(false);

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard
      .writeText(value)
      .then(() => true)
      .catch(() => fallbackCopy(value));
  }

  return Promise.resolve(fallbackCopy(value));
}

export default copyText;
