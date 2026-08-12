<template>
  <header class="demo-header">
    <div class="demo-header__bar">
      <DemoLogo class="demo-header__logo" />

      <div class="demo-header__actions">
        <span class="demo-header__company">Чебоксарский трубный завод</span>

        <v-btn
          icon
          :aria-label="dark ? 'Включить светлую тему' : 'Включить тёмную тему'"
          class="demo-header__icon"
          @click="$emit('toggle-theme')"
        >
          <v-icon>{{ dark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>

        <v-btn icon aria-label="Поиск" class="demo-header__icon">
          <v-icon>mdi-magnify</v-icon>
        </v-btn>

        <v-btn icon aria-label="Уведомления" class="demo-header__icon">
          <v-icon>mdi-bell-outline</v-icon>
        </v-btn>

        <v-btn icon aria-label="Профиль" class="demo-header__icon">
          <v-icon>mdi-account-circle-outline</v-icon>
        </v-btn>
      </div>
    </div>

    <nav class="demo-header__tabs" aria-label="Разделы Трансферы">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="demo-header__tab"
        :class="{ 'demo-header__tab--active': tab === activeTab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </nav>
  </header>
</template>

<script>
import DemoLogo from '@/demo/components/DemoLogo.vue';

export default {
  name: 'DemoHeader',

  components: { DemoLogo },

  props: {
    dark: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      activeTab: 'Главная',
      tabs: [
        'Главная',
        'Потребление',
        'Планирование',
        'Финансы',
        'Аналитика',
        'Отчётность',
        'Помощь',
      ],
    };
  },
};
</script>

<style lang="scss">
.demo-header {
  position: relative;
  z-index: 1;
  background-color: host-color(demo-page);
  border-bottom: 1px solid host-color(demo-border);

  &__bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $tok-space-md;
    max-width: 1440px;
    margin: 0 auto;
    padding: $tok-space-lg $tok-space-xl $tok-space-md;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: $tok-space-xs;
  }

  &__company {
    margin-right: $tok-space-sm;
    color: host-color(demo-text-muted);
    font-size: 15px;
  }

  &__icon .v-icon {
    color: host-color(demo-text-muted);
  }

  &__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: $tok-space-lg;
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 $tok-space-xl;
  }

  &__tab {
    position: relative;
    padding: 0 0 $tok-space-sm;
    color: host-color(demo-text-muted);
    font-size: 15px;
    background: none;
    border: 0;
    cursor: pointer;

    &--active {
      color: host-color(demo-text);
      font-weight: 600;

      &::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 2px;
        background-color: host-color(indigo, base);
        content: '';
      }
    }
  }
}

@media (max-width: 720px) {
  .demo-header__company {
    display: none;
  }
}
</style>
