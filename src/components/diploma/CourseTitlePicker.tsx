import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSE_TITLE_GROUPS, matchCourseTitle } from "@/lib/courseTitles";

interface CourseTitlePickerProps {
  /** Título tal como se guardará e imprimirá. */
  value: string;
  onChange: (title: string) => void;
}

const OTHER = "other";

/** Desplegable con los cursos del catálogo, por área, más «Otro» con texto manual. */
const CourseTitlePicker = ({ value, onChange }: CourseTitlePickerProps) => {
  const [otherChosen, setOtherChosen] = useState(false);
  const matched = matchCourseTitle(value);
  const isOther = matched === null && (otherChosen || value.trim() !== "");
  const selectValue = matched ?? (isOther ? OTHER : "");

  return (
    <div className="space-y-3">
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === OTHER) {
            setOtherChosen(true);
            onChange("");
          } else {
            setOtherChosen(false);
            onChange(next);
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

      {isOther && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe el título del curso, en mayúsculas"
          aria-label="Título del curso"
          className="h-14 rounded-xl border-white/10 bg-white/5 text-white focus:border-[#00b3f3] transition-all duration-200 text-lg"
        />
      )}
    </div>
  );
};

export default CourseTitlePicker;
