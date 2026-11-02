/**
 * OCC - Object Control Center
 * @author Cleiton Otávio de Sousa
 * @version 1.0.0
 */
/** @type {import('vite').UserConfig} */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
})
