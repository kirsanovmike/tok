<template>
  <div class="demo-dashboard">
    <section class="demo-dashboard__news" aria-label="Новости">
      <article v-for="item in news" :key="item.title" class="demo-news">
        <div class="demo-news__thumb" aria-hidden="true" />
        <div class="demo-news__body">
          <p class="demo-news__title">
            {{ item.title }}
          </p>
          <p class="demo-news__likes">
            <v-icon small> mdi-heart-outline </v-icon>
            <span>Нравится{{ item.likes ? ` (${item.likes})` : '' }}</span>
          </p>
        </div>
      </article>

      <a class="demo-news__more" href="#news">Читать ещё</a>
    </section>

    <div class="demo-dashboard__grid">
      <section class="demo-card demo-card--accent" aria-label="Потребление">
        <h2 class="demo-card__title">Потребление</h2>

        <div class="demo-period">
          <button
            v-for="period in periods"
            :key="period"
            type="button"
            class="demo-period__item"
            :class="{ 'demo-period__item--active': period === activePeriod }"
            @click="activePeriod = period"
          >
            {{ period }}
          </button>
        </div>

        <div class="demo-card__inner">
          <p class="demo-card__label">Потребление</p>
          <p class="demo-metric"><strong>3</strong><span>млн кВт·ч</span></p>

          <div class="demo-card__row">
            <div>
              <p class="demo-card__label">Прогноз</p>
              <p class="demo-metric demo-metric--sm"><strong>19</strong><span>млн кВт·ч</span></p>
            </div>
            <div>
              <p class="demo-card__label">Отклонение</p>
              <p class="demo-metric demo-metric--sm"><strong>14</strong><span>%</span></p>
            </div>
          </div>

          <div class="demo-sparkline" aria-hidden="true">
            <svg viewBox="0 0 240 60" preserveAspectRatio="none">
              <path
                d="M0 44 C 30 40, 45 20, 70 26 S 110 44, 140 30 S 190 14, 240 22"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </div>
        </div>
      </section>

      <section class="demo-card" aria-label="Планирование на ОРЭМ">
        <header class="demo-card__head">
          <h2 class="demo-card__title">Планирование<br />на ОРЭМ</h2>
          <p class="demo-metric"><strong>8,5</strong><span>млн кВт·ч</span></p>
        </header>

        <p class="demo-status">
          <v-icon small color="green"> mdi-check-circle </v-icon>
          <span>План загружен</span>
        </p>

        <div class="demo-card__inner">
          <p class="demo-card__label">Скорректированы 3/30 дней</p>
          <div class="demo-calendar">
            <span v-for="day in 31" :key="day" class="demo-calendar__day">{{ day }}</span>
          </div>
        </div>

        <a class="demo-card__link" href="#plan">Подать суточный план</a>
      </section>

      <section class="demo-card" aria-label="Задолженность">
        <header class="demo-card__head">
          <h2 class="demo-card__title">Задолженность</h2>
          <p class="demo-metric"><strong>12</strong><span>млн ₽</span></p>
        </header>

        <p class="demo-alert">
          <v-icon small color="red"> mdi-alert-circle </v-icon>
          <span>3 платежа</span>
        </p>

        <dl class="demo-list">
          <div v-for="row in debts" :key="row.label" class="demo-list__row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
      </section>

      <section class="demo-card demo-card--muted" aria-label="Качество электроэнергии">
        <div class="demo-card__badge" aria-hidden="true">
          <v-icon dark> mdi-timer-sand </v-icon>
        </div>
        <h2 class="demo-card__title">Качество электроэнергии</h2>
        <p class="demo-card__label">Страница в разработке</p>
      </section>
    </div>

    <div class="demo-dashboard__links">
      <a v-for="link in links" :key="link.title" class="demo-link" href="#section">
        <span class="demo-link__title">
          {{ link.title }}
          <v-icon small>mdi-chevron-right</v-icon>
        </span>
        <span class="demo-link__text">{{ link.text }}</span>
      </a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DemoDashboard',

  data() {
    return {
      activePeriod: 'День',
      periods: ['День', 'Неделя', 'Месяц', 'Год'],
      news: [
        { title: 'Электроэнергия как управляемая статья затрат', likes: 0 },
        { title: 'Как управление пиковыми нагрузками экономит бюджет', likes: 0 },
        { title: 'Поздравление с Днём энергетика!', likes: 3 },
        { title: 'Собственная генерация для бизнеса', likes: 8 },
      ],
      debts: [
        { label: 'На начало мая', value: '1 000 000 ₽' },
        { label: 'Выставлены счета', value: '120 000 ₽' },
        { label: 'Оплачено', value: '1 000 000 ₽' },
      ],
      links: [
        {
          title: 'Детализация стоимости',
          text: 'Из чего складывается стоимость за конкретный расчётный период',
        },
        {
          title: 'Отклонения от плана',
          text: 'Анализ отклонения плана от факта и инструменты по минимизации отклонений',
        },
        {
          title: 'Аномалии потребления',
          text: 'Нетипичные изменения потребления на основе исторических данных',
        },
      ],
    };
  },
};
</script>

<style lang="scss">
.demo-dashboard {
  max-width: 1440px;
  margin: 0 auto;
  padding: $tok-space-lg $tok-space-xl $tok-space-xl;
  color: host-color(demo-text);

  &__news {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $tok-space-lg;
    padding: $tok-space-md $tok-space-lg;
    border: 1px solid host-color(demo-border);
    border-radius: $tok-radius-lg;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: $tok-space-lg;
    margin-top: $tok-space-lg;
  }

  &__links {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: $tok-space-lg;
    margin-top: $tok-space-lg;
  }
}

.demo-news {
  display: flex;
  flex: 1 1 200px;
  gap: $tok-space-sm;
  align-items: center;

  &__thumb {
    flex: none;
    width: 56px;
    height: 56px;
    background-color: host-color(indigo, lighten4);
    border-radius: $tok-radius-md;
  }

  &__title {
    margin: 0;
    overflow: hidden;
    font-size: 14px;
    line-height: 1.3;
    text-overflow: ellipsis;
  }

  &__likes {
    display: flex;
    gap: $tok-space-xs;
    align-items: center;
    margin: $tok-space-xs 0 0;
    color: host-color(demo-text-muted);
    font-size: 13px;

    .v-icon {
      color: host-color(demo-text-muted);
    }
  }

  &__more {
    flex: none;
    color: host-color(indigo, base);
    font-weight: 600;
    text-decoration: underline;
  }
}

.demo-card {
  display: flex;
  flex-direction: column;
  gap: $tok-space-md;
  padding: $tok-space-lg;
  background-color: host-color(demo-card);
  border: 1px solid host-color(demo-border);
  border-radius: $tok-radius-lg;

  &--accent {
    background-color: host-color(demo-card-accent);
  }

  &--muted {
    background-color: host-color(demo-card-muted);
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $tok-space-md;
  }

  &__title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
  }

  &__label {
    margin: 0;
    color: host-color(demo-text-muted);
    font-size: 14px;
  }

  &__inner {
    padding: $tok-space-md;
    background-color: host-color(demo-card);
    border: 1px solid host-color(demo-border);
    border-radius: $tok-radius-md;
  }

  &__row {
    display: flex;
    gap: $tok-space-xl;
    margin-top: $tok-space-md;
  }

  &__link {
    color: host-color(indigo, base);
    font-weight: 600;
    text-decoration: underline;
  }

  &__badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 50%;

    @include tok-gradient;
  }
}

.demo-metric {
  display: flex;
  gap: $tok-space-xs;
  align-items: baseline;
  margin: 0;

  strong {
    font-size: 44px;
    line-height: 1;
  }

  span {
    color: host-color(demo-text-muted);
    font-size: 14px;
  }

  &--sm strong {
    font-size: 24px;
  }
}

.demo-period {
  display: flex;
  gap: $tok-space-xs;
  padding: $tok-space-xs;
  background-color: host-color(demo-card);
  border-radius: 999px;

  &__item {
    flex: 1 1 auto;
    padding: $tok-space-sm $tok-space-md;
    color: host-color(demo-text);
    font-size: 14px;
    background: none;
    border: 0;
    border-radius: 999px;
    cursor: pointer;

    &--active {
      color: host-color(shades, white);
      background-color: host-color(indigo, base);
    }
  }
}

.demo-status,
.demo-alert {
  display: flex;
  gap: $tok-space-sm;
  align-items: center;
  align-self: flex-start;
  margin: 0;
  padding: $tok-space-sm $tok-space-md;
  font-weight: 600;
  border-radius: 999px;
}

.demo-status {
  background-color: host-color(green, lighten4);
}

.demo-alert {
  background-color: host-color(red, lighten4);
}

.demo-list {
  margin: 0;
  padding: 0;

  &__row {
    display: flex;
    justify-content: space-between;
    padding: $tok-space-sm 0;

    dt {
      color: host-color(demo-text);
    }

    dd {
      margin: 0;
      font-variant-numeric: tabular-nums;
    }
  }
}

.demo-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-top: $tok-space-sm;

  &__day {
    padding: $tok-space-sm 0;
    color: host-color(demo-text-muted);
    font-size: 13px;
    text-align: center;
    border: 1px solid host-color(demo-border);
  }
}

.demo-sparkline {
  margin-top: $tok-space-md;
  color: host-color(indigo, base);

  svg {
    display: block;
    width: 100%;
    height: 60px;
  }
}

.demo-link {
  display: flex;
  flex-direction: column;
  gap: $tok-space-sm;
  padding: $tok-space-lg;
  color: host-color(demo-text);
  text-decoration: none;
  background-color: host-color(demo-card);
  border: 1px solid host-color(demo-border);
  border-radius: $tok-radius-lg;

  &__title {
    display: flex;
    gap: $tok-space-xs;
    align-items: center;
    font-weight: 700;

    .v-icon {
      color: host-color(demo-text);
    }
  }

  &__text {
    color: host-color(demo-text-muted);
    font-size: 14px;
  }
}
</style>
