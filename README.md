# GEX — GPU Execution Explorer

**See how a kernel becomes hardware execution.**

Six interactive EN/TR lessons connect GPU anatomy, SM resources, a vector-add launch, warp masks, memory access and tiled matrix multiplication. A real Blender/glTF model provides the hardware setting; deterministic TypeScript state drives the execution examples, code highlights and numerical references.

## Run locally

Use Node 22.12+ (validated with Node 22). Dependencies are locked.

```sh
npm ci --legacy-peer-deps
npm run dev:codex
```

Open **http://127.0.0.1:5296/gex/**. The repository's Run / Validate / Stop actions use a checkout-owned preview process. An occupied port is reported without stopping other applications.

```sh
npm run validate:codex
npm run stop:local
```

## Explore

| Route          | Experiment                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `/gex/anatomy` | Inspect named components; move from system to a warp.                                                          |
| `/gex/sm`      | Inspect scheduler, execution resources, registers and shared/L1 roles.                                         |
| `/gex/kernel`  | Change grid/block size; follow launch, scheduling, data requests and results.                                  |
| `/gex/warp`    | Step complementary masks; compare uniform and divergent control flow.                                          |
| `/gex/memory`  | Compare contiguous, strided and reproducible scattered addresses; choose a cache scenario.                     |
| `/gex/tensor`  | Select output cells, change educational tile size, compare scalar/MMA concepts and inspect exact partial sums. |

Play, pause, next/previous event, reset, speed and event selection control every lesson. Links preserve the lesson, locale, step and experiment parameters. Focus the scene and use the arrow keys to step. The text-view control exposes the same inputs and numerical state without requiring WebGL. Reduced-motion preferences make camera changes instant; backgrounding the page pauses playback.

## GPU Atlas integration

The existing public Atlas does not yet support module deep links. Standalone GEX links to its actual locale homepage and identifies the related module. The included integration patch adds real `#module=...` navigation, locale-preserving GEX links within related Atlas lessons, and Azure routes for `/gex`.

```sh
npm run build:atlas
# Use an isolated checkout of aserdargun/gpu-aserdargun-com at the compatible base.
node tools/prepare-atlas.mjs /absolute/path/to/atlas-checkout
# In that Atlas checkout, with Node 22:
npm run build:azure
```

`atlas-artifact/gex/` is the mountable static artifact. The patch is based on Atlas commit `17b5a630958972625e8547e9606a6f3a953a666d`; `git apply --check` refuses incompatible source. The integrated build requires `gex-dist/` and fails if it is missing. Only deploy after the combined artifact and reciprocal links have been reviewed. No Azure resource or public deployment is created by these scripts.

`VITE_ATLAS_DEEP_LINKS=true` makes the integrated GEX return to the Atlas on the same origin. `VITE_ATLAS_ORIGIN` can explicitly override that origin for a separate development setup. All static resources live below `/gex/` so they cannot collide with Atlas assets.

## Azure publication

The standalone release retains `/gex/...` routes and links back to the public GPU Atlas. `npm run build:azure` stages `azure-artifact/gex/`, verifies route and asset integrity, and writes commit-correlated `/release.json` metadata. The combined Atlas integration above remains a separate release path.

GitHub Actions deploys `main` using the single workflow `.github/workflows/deploy-swa-gex-aserdargun-com.yml`. The target is `swa-gex-aserdargun-com` in `rg-gex-aserdargun-com`, West Europe, **Free**, on **aserdargun subscription 3**. Deployment credentials exist only as an Actions secret. No custom domain is configured by this workflow.

## Geometry and source

- `blender/gex-master.blend`: editable hardware master, named anchors and reusable cameras.
- `blender/build_scene.py`: deterministic geometry builder, shared SM meshes, semantic materials and export rules.
- `public/models/gex-gpu.glb` and `gex-sm.glb`: self-contained web geometry, together under 1 MB.
- `public/models/manifest.json`: asset sizes, anchors and camera inventory.
- `src/data/`: bilingual curriculum, sources, component roles and lesson mappings.
- `src/lib/`: pure numerical model, URL validation and temporal state.
- `src/scene/`: interactive instancing, camera transitions, address traces and data packets.
- `public/examples/`: self-contained CUDA reference programs with host-side checks.
- `docs/curriculum.md`: source mapping, abstraction policy and scope boundaries.

Rebuild assets using `npm run assets:blender`. Set `GEX_BLENDER` if Blender is outside the default macOS installation. The `.blend` uses Z-up and exports Y-up glTF. Static geometry stays in Blender; parameter-dependent animation stays in the web runtime. Render time, frame time and physical hardware topology are not simulated.

## Accuracy and validation limits

The kernel launch uses four teaching SMs with one block slot each, not a universal capacity. The displayed 32-lane warp is a NVIDIA/CUDA concept. Address groups are an explicitly declared 32-byte educational model. Matrix tiles of 2 or 4 are not Tensor Core instruction shapes. The scalar CUDA example demonstrates shared-memory tiling; it does not claim to issue MMA instructions.

Numerical results are calculated, never presented as profiler measurements. The tests validate address grouping, complementary masks, launch waves, vector checksums, matrix products, tile partitioning, URL constraints and GLB structure. CUDA downloads require NVIDIA hardware and a CUDA Toolkit; they have not been compiled or run on this Mac.

Occupancy, architecture lenses, LLM inference and multi-GPU are future curriculum phases, deliberately outside the six-experience MVP.
