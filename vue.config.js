// VuetifyLoaderPlugin подключает `vue-cli-plugin-vuetify` — он же следит,
// чтобы плагин применился после VueLoaderPlugin. Руками его добавлять не нужно.
module.exports = {
  transpileDependencies: ['vuetify'],
  css: {
    loaderOptions: {
      scss: {
        // Палитра демо-хоста: функция `host-color()` нужна только `src/demo/`,
        // но `additionalData` подмешивается всем SFC — разделить их webpack не даёт.
        // Ни байта CSS файл не порождает: в нём одна функция.
        //
        // Стилям самого Тока подмешивать нечего: ни функций, ни миксинов, ни
        // SCSS-переменных у него нет — цвета читаются как `var(--v-tok-*)`,
        // остальное написано числами прямо в компонентах (ADR-0010). Поэтому
        // папка `src/Tok/` собирается в любом проекте без настройки sass-loader.
        additionalData: '@import "@/demo/styles/_host.scss";',
      },
    },
  },
};
