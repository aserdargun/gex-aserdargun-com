import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { lessons } from "../data/lessons";
import type { ExplorerState } from "../data/types";
import { addressForLane } from "../lib/simulation";

export function codeForState(state: ExplorerState) {
  const code = [...lessons[state.mode].code];
  if (["kernel", "anatomy", "sm"].includes(state.mode))
    code[9] = `add<<<${state.blocks}, ${state.threads}>>>(A, B, C, ${state.blocks * state.threads});`;
  if (state.mode === "warp" && state.branch === "uniform")
    code[1] = "if (true) { // all lanes choose A";
  if (state.mode === "memory")
    code[1] =
      state.pattern === "contiguous"
        ? "int address = lane;"
        : state.pattern === "strided"
          ? `int address = lane * ${state.stride};`
          : "int address = (lane * 73 + 19) % 256;";
  if (state.mode === "tensor")
    code[5] = state.tensorPath
      ? "  acc += matrix_multiply(a_tile, b_tile);"
      : "  acc += scalar_dot_products(a_tile, b_tile);";
  return code;
}
function highlight(line: string) {
  if (line.trim().startsWith("//"))
    return <span className="syntax-comment">{line}</span>;
  return line
    .split(
      /(\b(?:int|float|const|void|if|else|for|true|__global__)\b|\b\d+\b)/g,
    )
    .map((token, i) =>
      /^(int|float|const|void|if|else|for|true|__global__)$/.test(token) ? (
        <span className="syntax-keyword" key={i}>
          {token}
        </span>
      ) : /^\d+$/.test(token) ? (
        <span className="syntax-number" key={i}>
          {token}
        </span>
      ) : (
        token
      ),
    );
}
export function CodePanel({ state }: { state: ExplorerState }) {
  const [copiedCode, setCopiedCode] = useState(""),
    [copyFailed, setCopyFailed] = useState(false);
  const lesson = lessons[state.mode],
    step = lesson.steps[state.step],
    tr = state.locale === "tr";
  const code = codeForState(state);
  const codeText = code.join("\n");
  const copied = copiedCode === codeText;
  const singleWarpWait =
    state.mode === "kernel" && state.step === 9 && state.threads === 32;
  async function copy() {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedCode(codeText);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  }
  return (
    <section
      className="code-and-event"
      aria-label={tr ? "Kod ve yürütme eşlemesi" : "Code and execution mapping"}
    >
      <div className="code-panel">
        <div className="small-heading">
          <span>{lesson.codeKind[state.locale]}</span>
          <div className="code-actions">
            <a
              className="tiny-button"
              href={`${import.meta.env.BASE_URL}${lesson.relatedCodeExample}`}
              download
              aria-label={
                tr
                  ? "Çalıştırılabilir CUDA örneğini indir"
                  : "Download runnable CUDA example"
              }
            >
              <Download size={14} />
            </a>
            <button
              className="tiny-button"
              onClick={copy}
              aria-label={
                copied
                  ? tr
                    ? "Kod kopyalandı"
                    : "Code copied"
                  : tr
                    ? "Görünen kodu kopyala"
                    : "Copy displayed code"
              }
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        {copyFailed && (
          <small role="status">
            {tr
              ? "Kopyalanamadı. Kodu seçip kopyalayabilirsin."
              : "Copy unavailable. Select the code to copy it."}
          </small>
        )}
        <pre
          tabIndex={0}
          aria-label={tr ? "Vurgulanan kod satırı" : "Highlighted source code"}
        >
          <code>
            {code.map((line, i) => (
              <span
                key={i}
                className={`code-line ${step.line === i ? "highlighted" : ""}`}
                aria-current={step.line === i ? "step" : undefined}
              >
                <span className="line-number" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{highlight(line)}</span>
              </span>
            ))}
          </code>
        </pre>
      </div>
      <div className="event-panel" aria-live="polite" aria-atomic="true">
        <div className="small-heading">
          {tr ? "ŞİMDİKİ ADIM" : "CURRENT STEP"}:{" "}
          <span className="sage">{step.label[state.locale]}</span>
        </div>
        <h3>
          {singleWarpWait
            ? tr
              ? "Bu SM’de başka hazır warp yok."
              : "No other warp is ready on this SM."
            : step.title[state.locale]}
        </h3>
        <p>
          {singleWarpWait
            ? tr
              ? "32 thread ve bir blok yeriyle bu eğitim SM’sinde yalnızca bir warp bulunur. Alternatif iş görebilmek için blok boyutunu artır."
              : "With 32 threads and one block slot, this teaching SM has only one resident warp. Increase the block size to introduce other work."
            : step.body[state.locale]}
        </p>
        {state.mode === "memory" && (
          <code className="event-formula">
            lane {state.selectedLane} → A[
            {addressForLane(state.selectedLane, state.pattern, state.stride)}]
          </code>
        )}
        {state.reducedMotion && (
          <small className="motion-note">
            {tr
              ? "Azaltılmış hareket: kamera geçişleri anlık."
              : "Reduced motion: camera transitions are instant."}
          </small>
        )}
      </div>
    </section>
  );
}
