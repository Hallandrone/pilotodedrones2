/**
 * Medidas compartidas entre el PDF del diploma (DiplomaPDF) y su vista previa
 * en el generador, para que ambos muestren lo mismo.
 */

/** Ancho útil para el título del curso, en puntos (página de 935 pt con márgenes). */
export const COURSE_TITLE_MAX_WIDTH = 780;
/** Ancho medio de un carácter del título en «em» (Quicksand Bold, mayúsculas; medido con fontTools). */
export const COURSE_TITLE_CHAR_WIDTH = 0.58;
/** Espaciado entre letras del título, en puntos por carácter (letterSpacing: 0.5). */
export const COURSE_TITLE_LETTER_SPACING = 0.5;
const COURSE_TITLE_MIN_SIZE = 18;

/**
 * Tamaño del título del curso. Los títulos cortos conservan los tamaños de
 * siempre (54, 46 y 38); los largos se reducen hasta caber en una sola línea,
 * para que no se corten en el borde ni se monten sobre la fecha.
 */
export const getCourseTitleFontSize = (title: string): number => {
  const length = title.trim().length;
  if (length === 0) return 54;
  const cap = length <= 20 ? 54 : length <= 30 ? 46 : 38;
  const fit = Math.floor((COURSE_TITLE_MAX_WIDTH - COURSE_TITLE_LETTER_SPACING * length) / (COURSE_TITLE_CHAR_WIDTH * length));
  return Math.max(COURSE_TITLE_MIN_SIZE, Math.min(cap, fit));
};

/** Tamaño del nombre del alumno, como siempre. */
export const getStudentNameFontSize = (name: string): number => {
  const length = name.length;
  if (length <= 20) return 65;
  if (length <= 30) return 56;
  if (length <= 40) return 48;
  if (length <= 50) return 40;
  return 32;
};
