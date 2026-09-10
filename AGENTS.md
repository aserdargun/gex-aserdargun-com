# GEX working contract

- Build GPU Execution Explorer (gex) — a bilingual (tr/en) interactive six-mode GPU lesson site (`/gex/anatomy`, `/gex/sm`, `/gex/kernel`, `/gex/warp`, `/gex/memory`, `/gex/tensor`) that connects GPU anatomy, SM resources, kernel launches, warp masks, memory access, and tiled matrix multiplication.
- Source of truth lives in `src/` (Vite + React 19 + Three.js scene + deterministic TypeScript state), `public/` and `blender/` (real Blender/glTF hardware model), `tools/` (preview, stage, verify, atlas integration), and `tests/` (vitest gates). No real GPU execution in-browser; numerical values are reproducible from `(lesson, locale, step, parameters)`.
- Decision inputs are lesson/locale selection, step navigation, experiment parameters, and cached scene asset versions. Camera position, scene masks, code highlight, and step timestamps are observer outputs and never feed back into lesson state.
- Behavior, experiment, world, simulation, metric, and export schema versions are explicit. Update affected versions when semantics change.
- Every build is staged into `dist/` with `staticwebapp.config.json`; `npm run build:azure` produces the Azure SWA artifact and `node tools/verify-azure.mjs` validates it. Reject runs whose Azure routes or versioned configs drift.
- Brand uses the gex palette (sage `#abd8c1`, compute `#eab785`, data `#85b9d5`, dark `#111719`). Lime `#c8ff36` is reserved for the public family and is forbidden here.
- Capability: this repo is read + write; other public subdomains are read-only; `nxt` / `stk` / `inf` private subdomains are read-only; `aserdargun-com` is read-only.
- Deploy rule: each commit on `main` ends with `git push`, a CI cron to follow the Azure SWA build, a live URL verify at https://gex.aserdargun.com/, then the cron is deleted.
- Verify `npm run validate:codex` and review `git diff --check` before handoff. Keep Turkish and English controls and explanations equivalent. Label model assumptions and units.
- Local work only unless the user authorizes external publication. Preserve unrelated work and processes.
