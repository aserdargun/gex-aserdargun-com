import { lessons } from "../data/lessons";
import { l, type ExplorerState, type LessonStep } from "../data/types";
import { launchShape } from "./simulation";

/** One explanation for the scene, text alternative, timeline and code panel. */
export function stepForState(state: ExplorerState): LessonStep {
  const step = lessons[state.mode].steps[state.step];
  if (state.mode === "kernel" && state.step === 9 && state.threads === 32)
    return {
      ...step,
      title: l(
        "No other warp is ready on this SM.",
        "Bu SM’de başka hazır warp yok.",
      ),
      body: l(
        "With 32 threads and one block slot, this teaching SM has only one resident warp. Increase the block size to introduce other work.",
        "32 thread ve bir blok yeriyle bu eğitim SM’sinde yalnızca bir warp bulunur. Alternatif iş görebilmek için blok boyutunu artır.",
      ),
    };
  if (
    state.mode === "kernel" &&
    state.step === 13 &&
    launchShape(state.blocks, state.threads).waves === 1
  )
    return {
      ...step,
      title: l(
        "One wave covers this launch.",
        "Bu başlatma için tek dalga yeterli.",
      ),
      body: l(
        "All blocks fit in the four teaching SM slots. There are no remaining waves to repeat; continue to the calculated result.",
        "Tüm bloklar dört eğitim SM’sindeki yerlere sığar. Tekrarlanacak başka dalga yok; hesaplanan sonuca geç.",
      ),
    };
  if (state.mode === "warp" && state.branch === "uniform") {
    if (state.step === 1 || state.step === 2)
      return {
        ...step,
        body: l(
          "All 32 lanes choose A. The A mask includes the entire warp; no lane is waiting for a B path.",
          "32 şeridin tamamı A’yı seçer. A maskesi tüm warp’ı kapsar; B yolunu bekleyen şerit yoktur.",
        ),
      };
    if (state.step === 3)
      return {
        ...step,
        title: l("Skip the empty B path.", "Boş B yolunu atla."),
        body: l(
          "No lane chose B, so its mask is empty (0 / 32). This teaching step shows the skipped path; it does not represent an executed B instruction.",
          "Hiçbir şerit B’yi seçmedi; maskesi boş (0 / 32). Bu eğitim adımı atlanan yolu gösterir; yürütülen bir B komutunu temsil etmez.",
        ),
      };
  }
  if (state.mode === "memory" && state.cacheHit && state.step === 2)
    return {
      ...step,
      title: l("The L1 hit stays local.", "L1 isabeti yerelde kalır."),
      body: l(
        "The selected L1-hit scenario supplies the value locally. L2 and device memory are bypassed; address-group counts remain unchanged.",
        "Seçilen L1 isabeti senaryosu veriyi yerelde sağlar. L2 ve aygıt belleğine gidilmez; adres grubu sayıları değişmez.",
      ),
    };
  if (state.mode === "tensor" && !state.tensorPath && state.step === 4)
    return { ...step, label: l("FMA", "FMA") };
  return step;
}
