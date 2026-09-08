import { Play, Pause, SkipForward, RotateCcw, ChevronLeft } from "lucide-react";
import { lessons } from "../data/lessons";
import type { Explorer } from "../lib/useExplorer";

export function Playback({ state, act, patch }: Explorer) {
  const lesson = lessons[state.mode],
    tr = state.locale === "tr";
  const all = lesson.steps;
  const visible =
    all.length > 7 ? [0, 1, 2, 4, 7, 11, 14] : all.map((_, i) => i);
  const currentGroup = visible.filter((i) => i <= state.step).at(-1);
  return (
    <section
      className="playback"
      aria-label={tr ? "Yürütme kontrolleri" : "Execution controls"}
    >
      <div className="transport">
        <button
          className="play-button"
          onClick={() => act({ type: "play" })}
          aria-label={
            state.playing ? (tr ? "Duraklat" : "Pause") : tr ? "Oynat" : "Play"
          }
          title={state.playing ? "Pause" : "Play"}
        >
          {state.playing ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>
        <button
          className="icon-button previous"
          onClick={() => act({ type: "step", value: state.step - 1 })}
          disabled={state.step === 0}
          aria-label={tr ? "Önceki olay" : "Previous event"}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          onClick={() => act({ type: "step", value: state.step + 1 })}
          disabled={state.step === all.length - 1}
          aria-label={tr ? "Sonraki olay" : "Next event"}
        >
          <SkipForward size={19} />
        </button>
        <button
          className="icon-button"
          onClick={() => act({ type: "reset" })}
          aria-label={tr ? "Yürütmeyi sıfırla" : "Reset execution"}
        >
          <RotateCcw size={18} />
        </button>
        <label className="speed">
          <span className="sr-only">
            {tr ? "Oynatma hızı" : "Playback speed"}
          </span>
          <select
            aria-label={tr ? "Oynatma hızı" : "Playback speed"}
            value={state.speed}
            onChange={(e) => patch({ speed: Number(e.target.value) })}
          >
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
      <ol
        className="timeline"
        aria-label={
          tr
            ? "Eğitim amaçlı zaman çizelgesi"
            : "Educational execution timeline"
        }
      >
        {visible.map((i) => (
          <li
            key={i}
            className={
              currentGroup === i ? "current" : i < state.step ? "passed" : ""
            }
          >
            <button
              onClick={() => act({ type: "step", value: i })}
              aria-current={currentGroup === i ? "step" : undefined}
            >
              <i aria-hidden="true" />
              <span>{all[i].label[state.locale]}</span>
            </button>
          </li>
        ))}
      </ol>
      <label className="event-select">
        <span>
          {tr ? "Olay" : "Event"} {state.step + 1}/{all.length}
        </span>
        <select
          aria-label={tr ? "Olay seç" : "Choose event"}
          value={state.step}
          onChange={(e) => act({ type: "step", value: Number(e.target.value) })}
        >
          {all.map((s, i) => (
            <option value={i} key={i}>
              {String(i + 1).padStart(2, "0")} · {s.label[state.locale]}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}

export function ExperimentControls({ state, patch }: Explorer) {
  const tr = state.locale === "tr";
  if (state.mode === "anatomy" || state.mode === "sm") return null;
  const change = (value: Parameters<typeof patch>[0]) =>
    patch({ ...value, playing: false });
  return (
    <div className="experiment-controls">
      {state.mode === "kernel" && (
        <>
          <label>
            {tr ? "Bloklar" : "Blocks"}
            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={state.blocks}
              onChange={(e) =>
                change({ blocks: Number(e.target.value), step: 0 })
              }
            />
            <output>{state.blocks}</output>
          </label>
          <label>
            {tr ? "Thread / blok" : "Threads / block"}
            <select
              value={state.threads}
              onChange={(e) =>
                change({ threads: Number(e.target.value), step: 0 })
              }
            >
              {[32, 64, 128, 256].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {state.mode === "warp" && (
        <div
          className="segmented"
          role="group"
          aria-label={tr ? "Dallanma deseni" : "Branch pattern"}
        >
          {(["uniform", "divergent"] as const).map((branch) => (
            <button
              key={branch}
              aria-pressed={state.branch === branch}
              onClick={() => change({ branch })}
            >
              {branch === "uniform"
                ? tr
                  ? "Tek tip"
                  : "Uniform"
                : tr
                  ? "Dallanan"
                  : "Divergent"}
            </button>
          ))}
        </div>
      )}
      {state.mode === "memory" && (
        <>
          <div
            className="segmented"
            role="group"
            aria-label={tr ? "Erişim deseni" : "Access pattern"}
          >
            {(["contiguous", "strided", "scattered"] as const).map((p) => (
              <button
                key={p}
                aria-pressed={state.pattern === p}
                onClick={() => change({ pattern: p })}
              >
                {p === "contiguous"
                  ? tr
                    ? "Bitişik"
                    : "Contiguous"
                  : p === "strided"
                    ? tr
                      ? "Sabit adımlı"
                      : "Strided"
                    : tr
                      ? "Dağınık"
                      : "Scattered"}
              </button>
            ))}
          </div>
          {state.pattern === "strided" && (
            <label>
              {tr ? "Adres adımı" : "Address stride"}
              <select
                value={state.stride}
                onChange={(e) => change({ stride: Number(e.target.value) })}
              >
                {[1, 2, 4, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            {tr ? "Önbellek senaryosu" : "Cache scenario"}
            <select
              value={state.cacheHit ? "hit" : "cold"}
              onChange={(e) => change({ cacheHit: e.target.value === "hit" })}
            >
              <option value="cold">
                {tr ? "Soğuk erişim" : "Cold access"}
              </option>
              <option value="hit">
                {tr ? "Örnek L1 isabeti" : "Example L1 hit"}
              </option>
            </select>
          </label>
        </>
      )}
      {state.mode === "tensor" && (
        <>
          <label>
            {tr ? "Eğitim döşemesi" : "Teaching tile"}
            <select
              value={state.tileSize}
              onChange={(e) => change({ tileSize: Number(e.target.value) })}
            >
              <option value={2}>2 × 2</option>
              <option value={4}>4 × 4</option>
            </select>
          </label>
          <div
            className="segmented"
            role="group"
            aria-label={tr ? "Hesaplama yolu" : "Compute path"}
          >
            <button
              aria-pressed={!state.tensorPath}
              onClick={() => change({ tensorPath: false })}
            >
              {tr ? "Skaler aritmetik" : "Scalar arithmetic"}
            </button>
            <button
              aria-pressed={state.tensorPath}
              onClick={() => change({ tensorPath: true })}
            >
              Tensor / MMA
            </button>
          </div>
        </>
      )}
    </div>
  );
}
