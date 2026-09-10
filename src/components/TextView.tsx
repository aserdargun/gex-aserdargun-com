import { components, anatomyParts, smParts } from "../data/components";
import { stepForState } from "../lib/presentation";
import {
  laneMask,
  memoryAccess,
  matrixResult,
  matrixA,
  matrixB,
  tileCells,
} from "../lib/simulation";
import type { Explorer } from "../lib/useExplorer";

export function TextView({ state, patch }: Pick<Explorer, "state" | "patch">) {
  const tr = state.locale === "tr",
    step = stepForState(state);
  const waiting = state.mode === "kernel" && [8, 9].includes(state.step);
  const mask =
    state.mode === "warp"
      ? laneMask(state.branch, state.step)
      : Array(32).fill(true);
  return (
    <div className="text-view">
      <div className="small-heading">
        {tr ? "ETKİLEŞİMLİ METİN GÖRÜNÜMÜ" : "INTERACTIVE TEXT VIEW"}
      </div>
      <h3>{step.title[state.locale]}</h3>
      <p>{step.body[state.locale]}</p>
      {state.mode === "anatomy" || state.mode === "sm" ? (
        <div className="component-list">
          {(state.mode === "sm" ? smParts : anatomyParts).map((id) => (
            <button
              key={id}
              aria-pressed={state.selectedComponent === id}
              onClick={() => patch({ selectedComponent: id })}
            >
              <strong>{components[id].name[state.locale]}</strong>
              <span>{components[id].role[state.locale]}</span>
            </button>
          ))}
        </div>
      ) : state.mode === "tensor" ? (
        <MatrixTable state={state} patch={patch} />
      ) : (
        <>
          <div
            className="accessible-lanes"
            aria-label={tr ? "32 mantıksal şerit" : "32 logical lanes"}
          >
            {Array.from({ length: 32 }, (_, id) => (
              <button
                key={id}
                aria-pressed={state.selectedLane === id}
                className={mask[id] && !waiting ? "active" : ""}
                onClick={() => patch({ selectedLane: id })}
              >
                <strong>{id.toString().padStart(2, "0")}</strong>
                <small>
                  {waiting
                    ? tr
                      ? "bekliyor"
                      : "waiting"
                    : mask[id]
                      ? tr
                        ? "etkin"
                        : "active"
                      : tr
                        ? "maskeli"
                        : "masked"}
                </small>
              </button>
            ))}
          </div>
          {state.mode === "memory" && <AddressTable state={state} />}
        </>
      )}
    </div>
  );
}
export function AddressTable({ state }: Pick<Explorer, "state">) {
  const access = memoryAccess(state.pattern, state.stride),
    tr = state.locale === "tr";
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      aria-label={tr ? "Şerit adres tablosu" : "Lane address table"}
    >
      <table>
        <caption>
          {tr
            ? "Adres deseni: 8 değerlik eğitim grupları"
            : "Address pattern: educational groups of 8 values"}
        </caption>
        <thead>
          <tr>
            <th>{tr ? "Şerit" : "Lane"}</th>
            <th>{tr ? "Eleman indeksi" : "Element index"}</th>
            <th>{tr ? "Bayt ofseti" : "Byte offset"}</th>
            <th>{tr ? "Adres grubu" : "Address group"}</th>
          </tr>
        </thead>
        <tbody>
          {access.addresses.map((address, lane) => (
            <tr
              key={lane}
              className={state.selectedLane === lane ? "selected" : ""}
            >
              <th>{lane}</th>
              <td>A[{address}]</td>
              <td>{address * 4}</td>
              <td>{Math.floor(address / 8)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function MatrixTable({
  state,
  patch,
  reference = false,
}: Pick<Explorer, "state" | "patch"> & { reference?: boolean }) {
  const tr = state.locale === "tr";
  const fullResult = matrixResult();
  const result = state.step === 4 ? matrixResult(state.tileSize) : fullResult,
    cells = tileCells(state.selectedCell, state.tileSize);
  return (
    <div className="matrix-reference">
      {reference && (
        <p>
          {tr
            ? "Tam matematiksel referans; GPU ölçümü değildir."
            : "Full mathematical reference; not a GPU measurement."}
        </p>
      )}
      <div className="matrix-tables">
        {(reference ? ["A", "B", "C"] : ["C"]).map((name) => (
          <div
            className="table-scroll"
            key={name}
            tabIndex={0}
            aria-label={tr ? `${name} matrisi` : `${name} matrix`}
          >
            <table>
              <caption>{name} · 8 × 8</caption>
              <tbody>
                {Array.from({ length: 8 }, (_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 8 }, (_, col) => {
                      const id = row * 8 + col,
                        value =
                          name === "A"
                            ? matrixA[id]
                            : name === "B"
                              ? matrixB[id]
                              : reference
                                ? fullResult[id]
                                : state.step >= 4 && cells.includes(id)
                                  ? result[id]
                                  : "—";
                      return (
                        <td key={col}>
                          {name === "C" ? (
                            <button
                              aria-label={`C[${row},${col}] = ${value}`}
                              aria-pressed={state.selectedCell === id}
                              onClick={() => patch({ selectedCell: id })}
                            >
                              {value}
                            </button>
                          ) : (
                            value
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
