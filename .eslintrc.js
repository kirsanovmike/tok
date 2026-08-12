module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'plugin:vue/recommended',
    '@vue/airbnb',
    'plugin:vuetify/base',
    'plugin:prettier/recommended',
    // В eslint-config-prettier 6 правила eslint-plugin-vue отключаются отдельным конфигом,
    // иначе vue/max-attributes-per-line воюет с форматированием prettier.
    'prettier/vue',
  ],
  parserOptions: {
    parser: 'babel-eslint',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // Переносимая папка src/tok не должна знать о демо-хосте.
    'no-restricted-imports': [
      'error',
      {
        patterns: ['@/demo/*', '**/demo/*'],
      },
    ],
    'import/prefer-default-export': 'off',
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
  },
  overrides: [
    {
      // Ограничение на импорты из demo действует только внутри src/tok.
      files: ['src/demo/**/*.{js,vue}', 'src/main.js', 'tests/**/*.js'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
    {
      // Не только `*.spec.js`: рядом лежат общие помощники тестов
      // (`tests/unit/support/`), которым тоже нужны глобальные функции Jest.
      files: ['**/tests/unit/**/*.{j,t}s?(x)'],
      env: {
        jest: true,
      },
    },
  ],
};
