<template>
  <v-app class="demo-app">
    <DemoHeader :dark="isDark" @toggle-theme="toggleTheme" />

    <v-main class="demo-app__main">
      <router-view />
    </v-main>

    <DemoFooter />

    <!-- Ток встраивается в хост одной строкой: всё остальное он делает сам. -->
    <Tok :config="tokConfig" />
  </v-app>
</template>

<script>
import { Tok } from '@/Tok';

import DemoHeader from '@/demo/components/DemoHeader.vue';
import DemoFooter from '@/demo/components/DemoFooter.vue';
import { THEME_STORAGE_KEY } from '@/demo/theme';
import { createDemoTokConfig } from '@/demo/tokConfig';

export default {
  name: 'DemoApp',

  components: { DemoHeader, DemoFooter, Tok },

  data() {
    return {
      /* Настройки Тока для стенда: см. `demo/tokConfig.js`. */
      tokConfig: createDemoTokConfig(),
    };
  },

  computed: {
    isDark() {
      return this.$vuetify.theme.dark;
    },
  },

  methods: {
    toggleTheme() {
      const next = !this.$vuetify.theme.dark;
      this.$vuetify.theme.dark = next;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
      } catch (e) {
        // Хранилище недоступно — выбор просто не переживёт перезагрузку.
      }
    },
  },
};
</script>

<style lang="scss">
.demo-app {
  background-color: host-color(demo-page) !important;

  &__main {
    background-color: host-color(demo-page);
  }
}
</style>
