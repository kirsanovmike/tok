// VuetifyLoaderPlugin подключает `vue-cli-plugin-vuetify` — он же следит,
// чтобы плагин применился после VueLoaderPlugin. Руками его добавлять не нужно.
module.exports = {
  transpileDependencies: ['vuetify'],
  css: {
    loaderOptions: {
      scss: {
        // Токены Тока доступны в каждом SFC без ручного @import.
        // Файл не порождает CSS — только функции, миксины и переменные.
        additionalData: '@import "@/tok/styles/_tokens.scss";',
      },
    },
  },
};
