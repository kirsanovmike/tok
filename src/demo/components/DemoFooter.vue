<template>
  <footer class="demo-footer">
    <div class="demo-footer__inner">
      <section v-for="column in columns" :key="column.title" class="demo-footer__column">
        <h3 class="demo-footer__title">
          {{ column.title }}
        </h3>
        <ul class="demo-footer__list">
          <li v-for="item in column.items" :key="item">
            <a class="demo-footer__link" href="#footer">{{ item }}</a>
          </li>
        </ul>
      </section>

      <section class="demo-footer__column">
        <p class="demo-footer__phone">+7 (985) 808 30 77</p>
        <p class="demo-footer__caption">Персональный менеджер</p>
        <p class="demo-footer__phone">+7 (985) 808 30 77</p>
        <p class="demo-footer__caption">Поддержка</p>
      </section>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'DemoFooter',

  data() {
    return {
      columns: [
        {
          title: 'Информация',
          items: ['Полезные материалы', 'Регламенты', 'Инструкции', 'Видеоуроки', 'База знаний'],
        },
        {
          title: 'Работа с рынком',
          items: [
            'Месячные заявки',
            'Суточные корректировки',
            'Шаблоны заявок',
            'История заявок',
            'Планирование',
          ],
        },
        {
          title: 'Навигация',
          items: ['Главная', 'Дашборд', 'Аналитика', 'Отчёты', 'Личный кабинет'],
        },
      ],
    };
  },
};
</script>

<style lang="scss">
.demo-footer {
  padding: $tok-space-xl;
  background-color: host-color(demo-footer);

  &__inner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: $tok-space-xl;
    max-width: 1440px;
    margin: 0 auto;
  }

  &__title {
    margin: 0 0 $tok-space-md;
    color: host-color(demo-footer-text);
    font-size: 16px;
    font-weight: 700;
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__link {
    display: inline-block;
    padding: $tok-space-xs 0;
    color: host-color(demo-footer-text);
    font-size: 14px;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__phone {
    margin: 0;
    color: host-color(demo-footer-text);
    font-size: 20px;
    font-weight: 700;
  }

  &__caption {
    margin: 0 0 $tok-space-md;
    color: host-color(demo-footer-text);
    font-size: 14px;
    opacity: 0.7;
  }
}
</style>
