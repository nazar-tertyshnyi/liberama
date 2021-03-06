import Vue from 'vue';

import router from './router';
import store from './store';
import './quasar';

import vueSanitize from 'vue-sanitize';
Vue.use(vueSanitize);

import App from './components/App.vue';
//Vue.config.productionTip = false;
Vue.prototype.$isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);

new Vue({
    router,
    store,
    render: h => h(App),
}).$mount('#app');
