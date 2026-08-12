import Vue from 'vue';
import Vuetify from 'vuetify/lib/framework';

import { themes, THEME_STORAGE_KEY } from '@/demo/theme';

Vue.use(Vuetify);

function readSavedTheme() {
  // `?theme=dark` — только для демо-хоста: так удобно снимать скриншоты обеих тем.
  const forced = new URLSearchParams(window.location.search).get('theme');
  if (forced === 'dark' || forced === 'light') return forced === 'dark';

  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  } catch (e) {
    // Приватный режим браузера — просто стартуем со светлой темы.
    return false;
  }
}

export default new Vuetify({
  theme: {
    // Без этого Vuetify не отдаёт цвета в CSS-переменных `--v-*`,
    // а весь Ток покрашен именно через них.
    options: { customProperties: true },
    dark: readSavedTheme(),
    themes,
  },
});
