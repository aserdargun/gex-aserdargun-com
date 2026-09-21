# GEX curriculum and abstraction contract

GEX is the execution layer of GPU Kernel Atlas. Study theory, code and benchmarking methods in the Atlas; inspect spatial relationships and step through causal examples here. The first release contains exactly six experiences.

| Experience          | Engineering question                             | Interactive evidence                                                                                                                        | Atlas module                                            |
| ------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| GPU Anatomy         | Where do compute and memory live?                | Select package, die, processing group, SM, L2, memory controller and global memory; move through scale.                                     | Visual & Lasting Learning; Architecture → SIMT → CUDA   |
| Inside an SM        | How can resident work share execution resources? | Inspect the scheduler, register file, arithmetic, matrix and load/store resources. Step a waiting warp and another runnable warp.           | Architecture → SIMT → CUDA; GPU Memory Lab              |
| Kernel Launch       | How does code become parallel work?              | Follow vector addition from host launch through grid, block assignment, warps, addresses, loads, arithmetic and stores. Change launch size. | Architecture → SIMT → CUDA                              |
| Warp / SIMT         | What happens when lanes choose different paths?  | Inspect all 32 logical lanes, step active masks and reconvergence, compare uniform and alternating branches.                                | Architecture → SIMT → CUDA                              |
| Memory Journey      | Why does address layout change traffic?          | Switch contiguous, strided and deterministic scattered addresses; inspect touched educational address groups and a cache-hit/miss path.     | GPU Memory Lab                                          |
| Tensor / Tiled GEMM | How does tiling enable reuse?                    | Load A/B tiles, reach a block barrier, accumulate across K tiles, write a selected C tile; compare scalar and specialized matrix resources. | LLM Kernel Patterns; CUTLASS · CuTe · Tensor Core · PTX |

## Scientific contract

- **General principle**: locality, reuse, decomposition and finite resources.
- **NVIDIA / CUDA concept**: blocks, SMs, 32-thread warps and lane masks. These are not universal terms or widths for every GPU vendor.
- **Educational simplification**: geometry, schedules, spacing, durations, address groups and tile dimensions. No cycle accuracy, profiler output, physical die layout or hardware speedup is claimed.
- **Architecture-specific feature**: deferred to a sourced future lens. No Ada/Hopper/Blackwell/Rubin specification is inferred from the base model.

The anatomy model uses a small illustrative set of SMs. The kernel scenario uses four teaching SMs and one block slot per SM to make waves visible. The actual scheduler may place several blocks on an SM and use any legal assignment order. Threads in a block are grouped into warps by hardware. Logical lanes are not permanently dedicated physical cores.

Memory address groups are eight 32-bit values (32 bytes) in this _declared teaching example_. The interface counts touched groups, not measured transactions or bandwidth. Cache state, alignment, access width, instruction and architecture affect hardware behavior. Shared memory is explicitly managed block-local storage, not an automatic extra cache hop for every load.

The GEMM uses small exact integer inputs in a JavaScript reference calculation. Educational tile sizes are not Tensor Core instruction shapes. The Tensor path shows the concept of matrix multiply-accumulate; supported formats, fragment layouts and numerical behavior depend on the instruction and target architecture. Tiling also benefits scalar implementations. Neither path has a synthetic timing advantage.

## Source mapping

Reviewed 2026-09-21. Lesson records carry their own source links and Atlas/concept/code/experiment metadata.

- [NVIDIA CUDA programming model](https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html): hardware hierarchy and launch vocabulary.
- [NVIDIA advanced kernel programming](https://docs.nvidia.com/cuda/cuda-programming-guide/03-advanced/advanced-kernel-programming.html): SIMT, scheduling and independent thread execution boundaries.
- [NVIDIA writing SIMT kernels](https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html): indexing, memory access and cooperation.
- [NVIDIA CUDA best practices](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html): coalescing and shared-memory reuse.
- [CUTLASS efficient GEMM](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/efficient_gemm.html): hierarchical tiling and accumulation.
- [CUTLASS GEMM API](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/gemm_api.html): matrix operations at different execution levels.

The current Atlas source and live module navigation were checked. Public modules use `?module=visual|architecture|memory|cutlass`, with `/en/` for English and `/?lang=tr` for explicit Turkish. GEX and its ILS catalog link directly to the relevant module. The optional integration patch targets an older pinned checkout and retains its separate `#module=...` contract.

The root portfolio positions GPU Atlas as GEX’s parent and TFL as a related downstream lab. The bilingual breadcrumb and learning-path explanation expose this relationship. TFL’s existing prefill/decode handoff is a conceptual connection to the tensor/memory lessons, not an LLM simulator or a transfer of measured GPU work.

## Scope after the MVP

V2: occupancy/resource packing, bank conflicts, register pressure and sourced architecture lenses. V3: native LLM operation graphs, KV-cache and serving simulation beyond the existing conceptual TFL handoff. V4: multi-GPU topologies and collectives. These do not appear as nonfunctional MVP navigation items.

## Reproducible lesson observations

Each bilingual “Try this” prompt states an observation that the current controls can reproduce. Kernel scheduling text uses the selected block count; L1-hit timelines name the selected path. Memory strides are measured in elements, with four bytes per value. For C[0,0], the first K contribution is 7 with tile size 2 and 17 with tile size 4; both complete at 39. These are calculated reference values, not measured throughput or timing.

CUDA downloads have fixed reference settings and are not exports of URL parameters. The tiled GEMM download uses shared-memory scalar arithmetic, not MMA instructions. The UI states the NVIDIA GPU/CUDA Toolkit requirements.
