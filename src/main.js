import Vue from 'vue';
import '@mdi/font/css/materialdesignicons.css';

import { installTok } from '@/Tok';

import App from '@/demo/App.vue';
import vuetify from '@/demo/plugins/vuetify';
import router from '@/demo/router';
import store from '@/demo/store';

Vue.config.productionTip = false;

installTok(Vue);

new Vue({
  vuetify,
  router,
  store,
  render: (h) => h(App),
}).$mount('#app');
