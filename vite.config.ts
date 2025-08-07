import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  plugins: [
    // Plugin for React support
    react(),
    // Plugin to compile Electron main process and preload scripts
    electron({
      entry: {
        // The entry point for your Electron main process
        main: 'electron/main.ts',
        // The entry point for your preload script
        preload: 'electron/preload.ts',
      },
    }),
    // Plugin to handle Electron renderer process specifics
    renderer(),
  ],
});
