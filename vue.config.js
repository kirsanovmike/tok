// VuetifyLoaderPlugin подключает `vue-cli-plugin-vuetify` — он же следит,
// чтобы плагин применился после VueLoaderPlugin. Руками его добавлять не нужно.
module.exports = {
  transpileDependencies: ['vuetify'],
  css: {
    loaderOptions: {
      scss: {
        // Токены Тока доступны в каждом SFC без ручного @import — ровно так же,
        // как в Трансфере это делает партиал из `@tne-ui/core`. Вторым файлом —
        // палитра демо-хоста: она нужна только `src/demo/`, но `additionalData`
        // подмешивается всем, и разделить их webpack не даёт.
        // Ни один из двух файлов не порождает CSS: только функции и переменные.
        additionalData: `
          @import "@/Tok/styles/_tokens.scss";
          @import "@/demo/styles/_host.scss";
        `,
      },
    },
  },
};
