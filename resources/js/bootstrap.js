import axios from 'axios';
window.axios = axios;

// Set default headers
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// ✅ Dynamically add X-Socket-Id to each request (especially /broadcasting/auth)
axios.interceptors.request.use(config => {
    const socketId = window.Echo?.socketId();
    if (socketId) {
        config.headers['X-Socket-Id'] = socketId;
    }
    return config;
});
/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allow your team to quickly build robust real-time web applications.
 */

// import './echo';
