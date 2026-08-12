/**
 * Поверхности демо-хоста, снятые со скриншотов дашборда Трансферы
 * (`docs/referencies from FIGMA/Трансфера пример светлой темы.png` и `... тёмной темы.png`).
 *
 * Это не часть продовой палитры хоста — в Трансфере такие поверхности уже описаны
 * собственными правилами. Здесь они нужны только чтобы демо-страница была узнаваемой.
 * Наборы ключей `light` и `dark` обязаны совпадать.
 */

const light = {
  'demo-page': '#FFFFFF',
  'demo-card': '#FFFFFF',
  'demo-card-accent': '#F7F9FE',
  'demo-card-muted': '#F6F8F9',
  'demo-border': '#E0E0E0',
  'demo-text': '#14161A',
  'demo-text-muted': '#909090',
  'demo-footer': '#141460',
  'demo-footer-text': '#FFFFFF',
};

const dark = {
  'demo-page': '#0A0B21',
  'demo-card': '#151537',
  'demo-card-accent': '#151537',
  'demo-card-muted': '#212134',
  'demo-border': '#33335C',
  'demo-text': '#F2F2F2',
  'demo-text-muted': '#A1A1A1',
  'demo-footer': '#141460',
  'demo-footer-text': '#FFFFFF',
};

export default { light, dark };
