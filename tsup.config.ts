import { defineConfig } from 'tsup';

export default defineConfig(options => ({
	entry: ['src/server.ts'],
	format: ['esm'],
	target: 'esnext',
	clean: true,
	minify: !options.watch,
	splitting: false,
	// treeshake: true, // 开了反而变大，你受得了吗
	sourcemap: true,
	banner: {
		js: '#!/usr/bin/env node',
	},
	platform: 'node',
	// noExternal: [/(.*)/], // 依赖也打包
}));
