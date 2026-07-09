import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // sockjs-client (used by the realtime STOMP layer) references the Node-style `global`,
  // which doesn't exist in the browser. Alias it to globalThis so it loads at runtime.
  define: {
    global: 'globalThis',
  },
  plugins: [
    react({
      babel: {
        presets: [reactCompilerPreset()],
      },
    }),
  ],
})
