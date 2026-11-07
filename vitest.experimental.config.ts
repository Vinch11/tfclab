// Runs the experimental DET engine benches (excluded from the default suite: long, CI-only).
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";
export default mergeConfig(base, defineConfig({ test: { include: ["experimental/**/*.test.ts"] } }));
