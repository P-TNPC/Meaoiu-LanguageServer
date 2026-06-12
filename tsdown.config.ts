import { defineConfig } from 'tsdown';

export default defineConfig(options => ({
	entry: ['src/server.ts'],
	format: 'esm',
	target: 'esnext',
	clean: true,
	minify: !options.watch,
	// splitting: false, // tsdown 不支持关闭
	treeshake: false, // 不打包依赖开了没变化，只是让 map 变大
	sourcemap: true,
	fixedExtension: false, // 单格式，保持 .js 文件扩展名
	banner: {
		js: '#!/usr/bin/env node',
	},
	platform: 'node',
	// noExternal: [/(.*)/], // 依赖也打包
}));
