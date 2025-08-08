import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry file
        entry: 'electron/main.ts',
      },
      {
        // Preload script entry file
        entry: 'electron/preload.ts',
        onstart(options) {
          // This will reload the renderer process whenever you change the preload script.
          options.reload();
        },
      },
    ]),
  ],
  // This ensures your assets are copied to the build folder
  publicDir: 'assets',
});
