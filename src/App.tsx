import {
  Component,
  Suspense,
  lazy,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Tag,
  FileText,
  Box,
  ChevronDown,
  Link2,
  Check,
  BookOpen,
} from "lucide-react";
import { lessons, modes } from "./data/lessons";
import { useExplorer } from "./lib/useExplorer";
import { stateUrl } from "./lib/state";
import type { ComponentId, Mode } from "./data/types";
import { Playback, ExperimentControls } from "./components/Controls";
import { CodePanel } from "./components/CodePanel";
import { Inspector, atlasUrl } from "./components/Inspector";
import { TextView, MatrixTable, AddressTable } from "./components/TextView";

import { LabShell, LearningContextNotice } from "@aserdargun/lab-ui";
import { manifest, experiments } from "./ils/catalog";
import { returnToServing, contextExplanation } from "./ils/context";
const Scene = lazy(() => import("./scene/Scene"));
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export default function App() {
  const explorer = useExplorer(),
    { state, patch, navigate, act, learningContext } = explorer;
  const servingUrl = returnToServing(learningContext, state.mode, state.locale);
  const [ready, setReady] = useState(false),
    [contextLost, setContextLost] = useState(false),
    [copiedLink, setCopiedLink] = useState(""),
    [shareError, setShareError] = useState(false);
  const tr = state.locale === "tr",
    lesson = lessons[state.mode];
  const experimentLink = new URL(stateUrl(state), window.location.origin).href;
  const linkCopied = copiedLink === experimentLink;
  const onComponent = useCallback(
    (id: ComponentId) => patch({ selectedComponent: id }),
    [patch],
  );
  const onLane = useCallback(
    (id: number) => patch({ selectedLane: id }),
    [patch],
  );
  const onCell = useCallback(
    (id: number) => patch({ selectedCell: id }),
    [patch],
  );
  const onReady = useCallback(() => setReady(true), []);
  const onContextLost = useCallback(() => {
    setContextLost(true);
    patch({ playing: false });
  }, [patch]);
  const fallback = (
    <div className="scene-fallback">
      <p role="status">
        {tr
          ? "3B görünüm kullanılamıyor. Etkileşimli metin görünümüyle devam edebilirsin."
          : "3D is unavailable. Continue with the interactive text view."}
      </p>
      <TextView state={state} patch={patch} />
    </div>
  );
  async function share() {
    try {
      await navigator.clipboard.writeText(experimentLink);
      setCopiedLink(experimentLink);
      setShareError(false);
    } catch {
      setShareError(true);
    }
  }
  return (
    <div className="gex-app">
      <a className="skip-link" href="#gex-main">
        {tr ? "İçeriğe geç" : "Skip to content"}
      </a>
      <header className="topbar">
        <a
          className="brand"
          href={`/gex/anatomy?lang=${state.locale}`}
          onClick={(e) => {
            e.preventDefault();
            navigate("anatomy");
          }}
          aria-label="GEX home"
        >
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" />
          <b>GEX</b>
        </a>
        <span className="brand-title">GPU Execution Explorer</span>
        <a
          className="atlas-link"
          href={atlasUrl(state.locale)}
          target="_blank"
          rel="noreferrer"
        >
          <span>GPU Kernel Atlas</span>
          <ArrowUpRight size={17} />
        </a>
        <div
          className="locale-switch"
          role="group"
          aria-label={tr ? "Dil" : "Language"}
        >
          <button aria-pressed={!tr} onClick={() => patch({ locale: "en" })}>
            EN
          </button>
          <button aria-pressed={tr} onClick={() => patch({ locale: "tr" })}>
            TR
          </button>
        </div>
      </header>
      <aside className="sidebar">
        <nav
          className="lesson-nav"
          aria-label={tr ? "GEX dersleri" : "GEX lessons"}
        >
          {modes.map((mode) => (
            <a
              key={mode}
              href={`/gex/${mode}?lang=${state.locale}`}
              className={state.mode === mode ? "active" : ""}
              aria-current={state.mode === mode ? "page" : undefined}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  navigate(mode);
                }
              }}
            >
              <span className="nav-number">{lessons[mode].number}</span>
              <span>{lessons[mode].name[state.locale]}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="semantic-legend">
            <span>
              <i className="compute" />
              {tr ? "Hesaplama (SM)" : "Compute (SM)"}
            </span>
            <span>
              <i className="memory" />
              {tr ? "Bellek" : "Memory"}
            </span>
            <span>
              <i className="data" />
              {tr ? "Veri" : "Data"}
            </span>
            <span>
              <i className="other" />
              {tr ? "Kavramsal model" : "Conceptual model"}
            </span>
          </div>
          <a
            className="sidebar-theory"
            href={atlasUrl(state.locale)}
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={15} />
            {tr ? "Oku · Kodla · Dene" : "Read · Code · Experiment"}
          </a>
        </div>
      </aside>
      <main id="gex-main" className="main" tabIndex={-1}>
        <label className="mobile-lessons">
          <BookOpen size={19} />
          <span className="sr-only">{tr ? "Ders seç" : "Choose lesson"}</span>
          <select
            value={state.mode}
            onChange={(e) => navigate(e.target.value as Mode)}
          >
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {lessons[mode].number} {lessons[mode].name[state.locale]}
              </option>
            ))}
          </select>
        </label>
        <div
          className={`page-heading ${state.mode !== "anatomy" ? "in-lesson" : ""}`}
        >
          <div>
            <h1>
              {state.mode === "anatomy"
                ? "GPU Execution Explorer"
                : lesson.heading[state.locale]}
            </h1>
            <p>
              {state.mode === "anatomy"
                ? tr
                  ? "Bir kernelin donanımda nasıl yürütüldüğünü gör."
                  : "See how a kernel becomes hardware execution."
                : state.mode === "warp"
                  ? tr
                    ? "32 mantıksal şeridi keşfet."
                    : "Explore 32 logical lanes."
                  : lesson.name[state.locale]}
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              navigate("kernel");
              if (!state.reducedMotion) act({ type: "play" });
            }}
          >
            {tr ? "Bir kerneli izle" : "Follow a kernel"}
            <ArrowRight size={18} />
          </button>
        </div>
        {learningContext && (
          <LearningContextNotice
            source="TFL"
            explanation={contextExplanation}
            locale={state.locale}
          >
            <a href={servingUrl}>
              {state.locale === "tr"
                ? "Sunuma dön → TFL"
                : "Return to serving → TFL"}
            </a>
          </LearningContextNotice>
        )}
        <div className="workbench">
          <section
            className="viewport-column"
            aria-label={
              tr ? "Etkileşimli keşif alanı" : "Interactive exploration area"
            }
          >
            <div className="viewport-toolbar">
              <div className="scale-path">
                <span>{tr ? "Sistem" : "System"}</span>
                <span>/</span>
                <span>
                  {state.mode === "anatomy"
                    ? tr
                      ? "Paket"
                      : "Package"
                    : state.mode === "sm"
                      ? "SM"
                      : state.mode === "tensor"
                        ? "GEMM"
                        : state.mode === "memory"
                          ? tr
                            ? "Bellek"
                            : "Memory"
                          : "SIMT"}
                </span>
                <span>/</span>
                <b>{lesson.steps[state.step].label[state.locale]}</b>
              </div>
              <div className="viewport-tools">
                <button
                  className="tool-button"
                  aria-label={tr ? "Etiketleri aç/kapat" : "Toggle labels"}
                  aria-pressed={state.labels}
                  onClick={() => patch({ labels: !state.labels })}
                >
                  <Tag size={14} />
                </button>
                <button
                  className="tool-button"
                  aria-label={
                    tr ? "Metin görünümünü aç/kapat" : "Toggle text view"
                  }
                  aria-pressed={state.textView}
                  onClick={() => patch({ textView: !state.textView })}
                >
                  {state.textView ? <Box size={15} /> : <FileText size={15} />}
                </button>
                <button
                  className="tool-button reset-view"
                  onClick={() => patch({ viewReset: state.viewReset + 1 })}
                >
                  <RotateCcw size={14} />
                  <span>{tr ? "Görünümü sıfırla" : "Reset view"}</span>
                </button>
              </div>
            </div>
            <div
              className={`viewport ${state.textView ? "text-mode" : ""}`}
              tabIndex={0}
              aria-label={
                tr
                  ? "3B sahne. Sağ ve sol oklarla adımla."
                  : "3D scene. Use right and left arrows to step."
              }
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  act({ type: "step", value: state.step + 1 });
                }
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  act({ type: "step", value: state.step - 1 });
                }
              }}
            >
              {state.textView ? (
                <TextView state={state} patch={patch} />
              ) : contextLost ? (
                fallback
              ) : (
                <SceneBoundary fallback={fallback}>
                  <Suspense
                    fallback={
                      <div className="loading-scene" role="status">
                        <Box size={32} />
                        <span>
                          {tr
                            ? "3B çalışma alanı yükleniyor…"
                            : "Loading the 3D workbench…"}
                        </span>
                        <button
                          className="text-link"
                          onClick={() => patch({ textView: true })}
                        >
                          {tr ? "Metin görünümünü aç" : "Open text view"}
                        </button>
                      </div>
                    }
                  >
                    <Scene
                      state={state}
                      onComponent={onComponent}
                      onLane={onLane}
                      onCell={onCell}
                      onReady={onReady}
                      onContextLost={onContextLost}
                    />
                  </Suspense>
                </SceneBoundary>
              )}
            </div>
            <div className="viewport-caption">
              <div className="mini-legend">
                <span>
                  <i className="compute" />
                  {tr ? "Hesaplama" : "Compute"}
                </span>
                <span>
                  <i className="memory" />
                  {tr ? "Bellek" : "Memory"}
                </span>
                <span>
                  <i className="data" />
                  {tr ? "Veri hareketi" : "Data movement"}
                </span>
              </div>
              <span>
                {state.textView
                  ? tr
                    ? "Klavye ile keşfet"
                    : "Explore with a keyboard"
                  : tr
                    ? "Döndürmek için sürükle · Yakınlaştırmak için kaydır"
                    : "Drag to orbit · Scroll to zoom"}
              </span>
            </div>
            {state.mode === "warp" && (
              <div className="lane-caveat">
                {tr
                  ? "Mantıksal şeritler; fiziksel çekirdekler değil."
                  : "Logical lanes, not physical cores."}
              </div>
            )}
            <ExperimentControls {...explorer} />
          </section>
          <Inspector {...explorer} />
        </div>
        <Playback {...explorer} />
        <CodePanel state={state} />
        <LabShell
          manifest={manifest}
          experiment={experiments.find((x) => x.id === state.mode)!}
          locale={state.locale}
          relatedLabs={manifest.related.labs!.map((link) =>
            link.id === "tfl" ? { ...link, url: servingUrl } : link,
          )}
        />
        <div className="statusbar">
          <span>
            {tr
              ? "Genel eğitim GPU’su · NVIDIA / CUDA yürütme kavramları"
              : "Generic educational GPU · NVIDIA / CUDA execution concepts"}
          </span>
          <div>
            <span className="no-telemetry">
              {tr ? "Donanım ölçümü içermez" : "No measured telemetry"}
            </span>
            <button
              className="share-button"
              onClick={share}
              aria-label={
                tr
                  ? "Bu deneyin bağlantısını kopyala"
                  : "Copy this experiment link"
              }
            >
              {linkCopied ? <Check size={13} /> : <Link2 size={13} />}
              <span aria-live="polite">
                {linkCopied
                  ? tr
                    ? "Kopyalandı"
                    : "Copied"
                  : tr
                    ? "Bağlantı"
                    : "Share"}
              </span>
            </button>
          </div>
        </div>
        {shareError && (
          <p role="status">
            {tr
              ? "Bu deneyin bağlantısı adres çubuğunda; oradan kopyalayabilirsin."
              : "The experiment URL is in the address bar; copy it from there."}
          </p>
        )}
        <details className="learning-details">
          <summary>
            <span>
              <BookOpen size={16} />
              {tr
                ? "Neden önemli? Model, kaynaklar ve deney verileri"
                : "Why it matters · model, sources & experiment data"}
            </span>
            <ChevronDown size={16} />
          </summary>
          <div className="learning-content">
            <section>
              <h2>{tr ? "Neden önemli?" : "Why it matters"}</h2>
              <p>{lesson.why[state.locale]}</p>
              <h3>{tr ? "Şimdi dene" : "Try this"}</h3>
              <p>{lesson.relatedExperiment[state.locale]}</p>
              <p className="relationship">{lesson.relatedConcept}</p>
            </section>
            <section>
              <h2>{tr ? "Kaynaklar ve kapsam" : "Sources & scope"}</h2>
              <p>
                {lesson.category[state.locale]} ·{" "}
                {tr ? "Kaynak kontrolü" : "Sources reviewed"} 2026-09-08
              </p>
              <ul>
                {lesson.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                      <ArrowUpRight size={14} />
                    </a>
                  </li>
                ))}
              </ul>
              <p>
                {tr
                  ? "Bu sahne bir eğitim modelidir; CUDA komutlarını GPU’da çalıştırmaz."
                  : "This scene is an educational model; it does not execute CUDA instructions on a GPU."}
              </p>
            </section>
          </div>
          {state.mode === "memory" && <AddressTable state={state} />}{" "}
          {state.mode === "tensor" && (
            <MatrixTable state={state} patch={patch} reference />
          )}
        </details>
        <span className="sr-only" data-testid="scene-status">
          {ready ? "3D ready" : "3D loading"}
        </span>
      </main>
    </div>
  );
}
