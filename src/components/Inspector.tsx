import { ArrowUpRight, ArrowRight, ChevronDown } from "lucide-react";
import { components, anatomyParts, smParts } from "../data/components";
import { lessons } from "../data/lessons";
import type { ComponentId } from "../data/types";
import {
  laneMask,
  launchShape,
  memoryAccess,
  vectorElement,
  vectorChecksum,
  matrixCell,
} from "../lib/simulation";
import type { Explorer } from "../lib/useExplorer";

export function atlasUrl(locale: string, module?: string) {
  // The public Atlas has no module deep links yet. The bridge enables them on an integrated build.
  const deep = import.meta.env.VITE_ATLAS_DEEP_LINKS === "true";
  const origin =
    import.meta.env.VITE_ATLAS_ORIGIN ||
    (deep ? window.location.origin : "https://gpu.aserdargun.com");
  // An explicit Turkish query prevents Atlas's saved English preference from overriding the return link.
  return `${origin}${locale === "tr" ? "/?lang=tr" : "/en/"}${deep && module ? `#module=${module}` : ""}`;
}
export function Inspector(explorer: Explorer) {
  const { state, patch, navigate } = explorer,
    lesson = lessons[state.mode],
    tr = state.locale === "tr";
  const selected = components[state.selectedComponent];
  const shape = launchShape(state.blocks, state.threads);
  const mem = memoryAccess(state.pattern, state.stride);
  const v = vectorElement(state.selectedLane);
  return (
    <aside
      className="inspector"
      aria-label={
        tr ? "Ders ve inceleme paneli" : "Lesson and inspection panel"
      }
    >
      <div className="lesson-intro">
        <div className="small-heading">
          {lesson.number} / {lesson.name[state.locale]}
        </div>
        <h2>{lesson.heading[state.locale]}</h2>
        <p>{lesson.description[state.locale]}</p>
      </div>
      <section className="inspect-section">
        <div className="small-heading">{tr ? "İNCELENEN" : "INSPECTING"}</div>
        {state.mode === "anatomy" || state.mode === "sm" ? (
          <>
            <label className="component-select">
              <span className="sr-only">
                {tr ? "Bir parça seç" : "Select a component"}
              </span>
              <select
                value={state.selectedComponent}
                onChange={(e) =>
                  patch({ selectedComponent: e.target.value as ComponentId })
                }
              >
                {[
                  ...new Set([
                    state.selectedComponent,
                    ...(state.mode === "sm" ? smParts : anatomyParts),
                  ]),
                ].map((id) => (
                  <option key={id} value={id}>
                    {components[id].name[state.locale]}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </label>
            <p>{selected.role[state.locale]}</p>
            <div className="relationship">
              {selected.relationship[state.locale]}
            </div>
            <button
              className="text-link"
              onClick={() =>
                navigate(state.mode === "anatomy" ? "sm" : "kernel")
              }
            >
              {state.mode === "anatomy"
                ? tr
                  ? "SM’nin içine gir"
                  : "Explore inside an SM"
                : tr
                  ? "Bir kerneli izle"
                  : "Follow a kernel"}
              <ArrowRight size={15} />
            </button>
          </>
        ) : (
          <>
            {state.mode !== "tensor" && (
              <label className="lane-inspect-label">
                {tr ? "Şerit" : "Lane"}
                <select
                  aria-label={tr ? "Seçili şerit" : "Selected lane"}
                  value={state.selectedLane}
                  onChange={(e) =>
                    patch({ selectedLane: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 32 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {state.mode === "kernel" && (
              <>
                <dl className="readout">
                  <div>
                    <dt>{tr ? "Toplam öğe" : "Elements"}</dt>
                    <dd>{shape.elements.toLocaleString(state.locale)}</dd>
                  </div>
                  <div>
                    <dt>{tr ? "Warp / blok" : "Warps / block"}</dt>
                    <dd>{shape.warpsPerBlock}</dd>
                  </div>
                  <div>
                    <dt>{tr ? "Örnek dalgalar" : "Example waves"}</dt>
                    <dd>{shape.waves}</dd>
                  </div>
                </dl>
                <div className="math-readout">
                  A[{v.i}] = {v.a}
                  <br />
                  B[{v.i}] = {v.b}
                  <br />
                  C[{v.i}] = {state.step >= 11 ? v.c : "—"}
                </div>
                {state.step === 14 && (
                  <div className="result-badge">
                    <span>
                      {tr
                        ? "Hesaplanan sağlama toplamı"
                        : "Calculated checksum"}
                    </span>
                    <strong>
                      {vectorChecksum(shape.elements).toLocaleString(
                        state.locale,
                      )}
                    </strong>
                  </div>
                )}
              </>
            )}
            {state.mode === "warp" && (
              <>
                <dl className="readout">
                  <div>
                    <dt>{tr ? "Etkin şeritler" : "Active lanes"}</dt>
                    <dd data-testid="active-lanes">
                      {
                        laneMask(state.branch, state.step).filter(Boolean)
                          .length
                      }{" "}
                      / 32
                    </dd>
                  </div>
                  <div>
                    <dt>{tr ? "Seçili şerit" : "Selected lane"}</dt>
                    <dd>
                      {laneMask(state.branch, state.step)[state.selectedLane]
                        ? tr
                          ? "Etkin"
                          : "Active"
                        : tr
                          ? "Maskeli"
                          : "Masked"}
                    </dd>
                  </div>
                </dl>
                <div className="math-readout">
                  i = {state.selectedLane}
                  <br />
                  {tr ? "Seçtiği yol" : "Chosen path"}:{" "}
                  {state.branch === "uniform" || state.selectedLane % 2 === 0
                    ? "A"
                    : "B"}
                </div>
              </>
            )}
            {state.mode === "memory" && (
              <>
                <dl className="readout">
                  <div>
                    <dt>{tr ? "Erişilen gruplar" : "Touched groups"}</dt>
                    <dd data-testid="touched-groups">{mem.groups.length}</dd>
                  </div>
                  <div>
                    <dt>{tr ? "İstenen veri" : "Requested data"}</dt>
                    <dd>128 B</dd>
                  </div>
                  <div>
                    <dt>{tr ? "Grup kapsamı" : "Group coverage"}</dt>
                    <dd>{mem.groupedBytes} B</dd>
                  </div>
                </dl>
                <div className="math-readout">
                  lane {state.selectedLane} → A[
                  {mem.addresses[state.selectedLane]}]<br />
                  {tr ? "Grup" : "Group"}{" "}
                  {Math.floor(mem.addresses[state.selectedLane] / 8)}
                </div>
                <small>
                  {tr
                    ? "Bu sayılar adres gruplama modeline aittir."
                    : "These counts describe the address-group model."}
                </small>
              </>
            )}
            {state.mode === "tensor" && (
              <>
                <label className="lane-inspect-label">
                  {tr ? "Çıktı öğesi" : "Output element"}
                  <select
                    aria-label={tr ? "Çıktı öğesi" : "Output element"}
                    value={state.selectedCell}
                    onChange={(e) =>
                      patch({ selectedCell: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 64 }, (_, i) => (
                      <option key={i} value={i}>
                        C[{Math.floor(i / 8)},{i % 8}]
                      </option>
                    ))}
                  </select>
                </label>
                <dl className="readout">
                  <div>
                    <dt>{tr ? "K döşemeleri" : "K tiles"}</dt>
                    <dd>{8 / state.tileSize}</dd>
                  </div>
                  <div>
                    <dt>{tr ? "Döşemedeki çıktılar" : "Outputs in tile"}</dt>
                    <dd>{state.tileSize ** 2}</dd>
                  </div>
                  <div>
                    <dt>{tr ? "Birikim" : "Accumulator"}</dt>
                    <dd data-testid="accumulator">
                      {state.step < 4
                        ? 0
                        : matrixCell(
                            Math.floor(state.selectedCell / 8),
                            state.selectedCell % 8,
                            state.step === 4 ? state.tileSize : 8,
                          )}
                    </dd>
                  </div>
                </dl>
                <small>
                  {tr
                    ? "Kesin tamsayılarla hesaplanan eğitim referansı."
                    : "Educational reference calculated with exact integers."}
                </small>
              </>
            )}
          </>
        )}
      </section>
      <section className="model-note">
        <div className="small-heading">{tr ? "MODEL NOTU" : "MODEL NOTE"}</div>
        <p>{lesson.note[state.locale]}</p>
        <a
          className="text-link underlined"
          href={atlasUrl(state.locale, lesson.relatedAtlas.module)}
          target="_blank"
          rel="noreferrer"
        >
          {tr ? "Teoriyi oku" : "Read the theory"}
          <ArrowUpRight size={15} />
        </a>
        <small className="atlas-module">
          GPU Atlas · {lesson.relatedAtlas.name}
        </small>
      </section>
    </aside>
  );
}
