import * as esbuild from "esbuild"

/** @type {import("esbuild").BuildOptions} */
const config = {
	entryPoints: ["src/ping.ts"],
	bundle: true,
	outfile: "dist/ping.js",
	format: "esm",
	mainFields: ["module", "main"],
	minify: true,
	treeShaking: true,
	external: ["*"],
}

await esbuild.build(config)
