// vite.config.ts

import { defineConfig } from 'vite';
import path from 'node:path';
import electron from 'vite-plugin-electron/simple';
import react from '@vitejs/plugin-react'; // Or your renderer framework's plugin

export default defineConfig({
  plugins: [
    react(), // Make sure your renderer plugin is here
    electron({
      main: {
        // The entry file for the main process
        entry: 'electron/main.ts',
      },
      preload: {
        // The entry file for the preload script
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      // Optional: Use this if you want Vite to handle the renderer process
      renderer: {},
    }),
  ],
});