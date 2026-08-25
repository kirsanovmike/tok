import Vue from 'vue';
import '@mdi/font/css/materialdesignicons.css';

// Стенд играет роль `@tne-ui/core`: объявляет `--v-tok-*` из палитры Vuetify.
import '@/demo/styles/tok-vars.scss';

import App from '@/demo/App.vue';
import vuetify from '@/demo/plugins/vuetify';
import router from '@/demo/router';
import store from '@/demo/store';

Vue.config.productionTip = false;

new Vue({
  vuetify,
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
