import { defineConfig } from "vite";

// `base: "./"` : toutes les adresses sont relatives, et la même construction
// marche à la racine d'un site, sous /voxel-world_runtime/sources/ (GitHub
// Pages) ou sous /runtime/voxel-world/<version>/ (la plateforme d'atelier).
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 5000,
  },
  worker: {
    format: "es",
  },
  server: {
    headers: { "Cache-Control": "no-store" },
  },
});
