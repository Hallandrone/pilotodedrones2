import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_COURSE_TITLES, COURSE_TITLE_GROUPS } from "@/lib/courseTitles";

interface CourseTitlePickerProps {
  /** Título tal como se guardará e imprimirá. */
  value: string;
  onChange: (title: string) => void;
}

const OTHER = "other";
type Mode = "catalog" | "other";

const modeFor = (value: string): Mode | null => {
  if (value === "") return null;
  return ALL_COURSE_TITLES.includes(value) ? "catalog" : "other";
};

/**
 * Desplegable con los cursos del catálogo, por área, más «Otro» con texto
 * manual. En «Otro» el texto es libre: nunca se reemplaza por un título del
 * catálogo aunque coincida mientras se escribe. Solo un cambio externo del
 * valor (por ejemplo, «Usar datos del último diploma») vuelve a decidir el modo.
 */
const CourseTitlePicker = ({ value, onChange }: CourseTitlePickerProps) => {
  const [mode, setMode] = useState<Mode>(() => modeFor(value) ?? "catalog");
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return; // cambio hecho desde este mismo componente
    lastEmitted.current = value;
    const next = modeFor(value);
    if (next) setMode(next);
  }, [value]);

  const emit = (next: string) => {
    lastEmitted.current = next;
    onChange(next);
  };

  const selectValue = mode === OTHER ? OTHER : ALL_COURSE_TITLES.includes(value) ? value : "";

  return (
    <div className="space-y-3">
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === OTHER) {
            setMode("other");
            emit("");
          } else {
            setMode("catalog");
            emit(next);
          }
        }}
      >
        <SelectTrigger id="courseTitle" className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] text-lg">
          <SelectValue placeholder="Selecciona el curso…" />
        </SelectTrigger>
        <SelectContent className="max-h-80 bg-[#1a1a1a] border-white/10 text-white">
          {COURSE_TITLE_GROUPS.map((group) => (
            <SelectGroup key={group.group}>
              <SelectLabel className="text-white/50">{group.group}</SelectLabel>
              {group.titles.map((title) => (
                <SelectItem key={title} value={title}>
                  {title}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel className="text-white/50">Otro</SelectLabel>
            <SelectItem value={OTHER}>Otro (ingresar manualmente)</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {mode === "other" && (
        <Input
          value={value}
          onChange={(e) => emit(e.target.value)}
          placeholder="Escribe el título del curso, en mayúsculas"
          aria-label="Título del curso"
          className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
        />
      )}
    </div>
  );
};

export default CourseTitlePicker;
