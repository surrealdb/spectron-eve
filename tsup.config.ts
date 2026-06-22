import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/tools/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Keep the framework + SDK external; consumers install them alongside us.
  external: ["eve", "zod"],
});
