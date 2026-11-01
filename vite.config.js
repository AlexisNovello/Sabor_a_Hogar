import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rolldownOptions: {
      input: readdirSync(fileURLToPath(new URL('.', import.meta.url)))
        .filter((archivo) => archivo.endsWith('.html'))
        .map((archivo) => fileURLToPath(new URL(archivo, import.meta.url))),
    },
  },
  plugins: [
    tailwindcss(),
  ],
})
