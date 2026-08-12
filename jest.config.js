// Пресет @vue/cli-plugin-unit-jest рассчитан на Jest 24 и jest-environment-jsdom-fifteen.
// Мы поднимаем Jest до 26 (см. overrides в package.json), поэтому конфиг собран вручную.
module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.vue$': 'vue-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '.+\\.(css|styl|less|sass|scss|png|jpg|ttf|woff|woff2)$': 'jest-transform-stub',
  },
  // Vuetify и amCharts 4 публикуются как ES-модули: без транспиляции Jest спотыкается
  // на первом же `export`. Webpack их понимает сам, поэтому сборки это не касается.
  transformIgnorePatterns: ['/node_modules/(?!vuetify|@amcharts)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Заплатки к урезанному SVG в jsdom — нужны amCharts 4, см. файл.
  setupFiles: ['<rootDir>/tests/unit/support/jsdomSvg.js'],
  snapshotSerializers: ['jest-serializer-vue'],
  testMatch: ['**/tests/unit/**/*.spec.[jt]s?(x)'],
  testURL: 'http://localhost/',
};
