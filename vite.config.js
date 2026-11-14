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
    {
      name: 'control-cuenta-bloqueada',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          const protegido = html.replace(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/g,
            (_, src) => {
              const ruta = src.startsWith('/') ? src : '/' + src;
              return `<script type="module">import { accesoPermitido } from '/src/lib/control-cuenta.js'; if (await accesoPermitido) await import('${ruta}');</script>`;
            });
          return protegido.replace('</head>', `<style id="espera-cuenta">body{visibility:hidden}</style><script type="module">import '/src/lib/control-cuenta.js';</script></head>`);
        },
      },
    },
    tailwindcss(),
  ],
})
