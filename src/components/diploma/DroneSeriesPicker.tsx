import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DRONE_SERIES_CATALOG } from "@/lib/droneSeries";

interface DroneSeriesPickerProps {
  /** Valores del catálogo marcados, en el orden en que se marcaron. */
  selected: string[];
  otherOn: boolean;
  other: string;
  /** Texto ya compuesto que se imprimirá tras «Certificado en la serie:». */
  composed: string;
  onChange: (selected: string[], otherOn: boolean, other: string) => void;
}

const CHIP = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-all";
const CHIP_ON = "border-[#00b3f3] bg-[#00b3f3]/20 text-white";
const CHIP_OFF = "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white";

/** Chips por marca para elegir una o varias series, más «Otra serie» con texto manual. */
const DroneSeriesPicker = ({ selected, otherOn, other, composed, onChange }: DroneSeriesPickerProps) => {
  const toggle = (value: string) => {
    const next = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
    onChange(next, otherOn, other);
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
      {DRONE_SERIES_CATALOG.map((brand) => (
        <div key={brand.brand} className="flex flex-wrap items-center gap-2">
          <span className="w-14 shrink-0 text-xs font-bold uppercase tracking-wider text-white/40">{brand.brand}</span>
          {brand.options.map((option) => {
            const active = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(option.value)}
                className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}
              >
                {active && <Check className="h-3.5 w-3.5" />}
                {option.label}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-14 shrink-0 text-xs font-bold uppercase tracking-wider text-white/40">Otro</span>
        <button
          type="button"
          aria-pressed={otherOn}
          onClick={() => onChange(selected, !otherOn, other)}
          className={`${CHIP} ${otherOn ? CHIP_ON : CHIP_OFF}`}
        >
          {otherOn ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          Otra serie (ingresar manualmente)
        </button>
      </div>

      {otherOn && (
        <Input
          id="droneSeries"
          value={other}
          onChange={(e) => onChange(selected, true, e.target.value)}
          placeholder="Ej: JOYANCE JTC10"
          className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
        />
      )}

      <p className="text-sm text-white/60">
        {composed ? (
          <>
            Se imprimirá: <span className="font-semibold text-white">Certificado en la serie: {composed}.</span>
          </>
        ) : (
          "Sin selección, el diploma no lleva la línea de serie."
        )}
      </p>
    </div>
  );
};

export default DroneSeriesPicker;
