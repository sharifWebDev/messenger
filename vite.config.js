import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
    ],
    // server: {
    //     host: '0.0.0.0',  // listen on all IPv4 addresses, so Ngrok or LAN can access it
    //     port: 5173,       // use Vite's default port 5173, NOT 8000 (Laravel runs on 8000)
    //     cors: {
    //         // origin: ['https://0f64bb05d5a1.ngrok-free.app'], // allow your Ngrok domain explicitly
    //         origin: '*'  //but more secure to restrict origin
    //     },
    //     strictPort: true,
    //     hmr: {
    //         host: '0f64bb05d5a1.ngrok-free.app',  // your Ngrok domain here for HMR to work
    //         // protocol: 'wss',                      // secure websocket
    //     },
    // },
});
