// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	integrations: [react()],
	adapter: cloudflare(),
	vite: {
		plugins: [tailwindcss()],
		build: {
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (!id.includes('node_modules')) return;
						if (id.includes('maplibre-gl')) return 'vendor-map';
						if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
						if (
							id.includes('@radix-ui') ||
							id.includes('vaul') ||
							id.includes('lucide-react')
						) {
							return 'vendor-ui';
						}
					},
				},
			},
		},
	},
});
