/**
 * Títulos de curso que puede llevar un diploma, consolidados a partir del
 * historial: el mismo curso aparecía con y sin tilde, con «CURSO» delante,
 * con erratas o con las palabras en otro orden. En el diploma se imprimen tal
 * cual. Lo que no esté aquí se escribe a mano con la opción «Otro».
 */
export interface CourseTitleGroup {
  group: string;
  titles: string[];
}

export const COURSE_TITLE_GROUPS: CourseTitleGroup[] = [
  {
    group: "Operación",
    titles: [
      "OPERADOR DE DRONES",
      "OPERADOR PROFESIONAL DE DRONES",
      "OPERADOR DE DRONES NOCTURNO",
      "HABILITACIÓN VUELO NOCTURNO",
      "INSTRUCTOR DE DRONES",
      "SEGURIDAD AÉREA CON DRONES",
      "MANTENIMIENTO DE DRONES",
    ],
  },
  {
    group: "Fotogrametría y LiDAR",
    titles: [
      "FOTOGRAMETRÍA MEDIANTE RPAS",
      "AEROFOTOGRAMETRÍA AVANZADA",
      "MÁSTER PLAN 360° CON DRONES",
      "ESPECIALIZACIÓN LIDAR CON DRONES",
      "OPERACIÓN DJI LIDAR L2",
      "OPERACIÓN DJI LIDAR L3",
      "OPERACIÓN WINGTRA GEN II",
    ],
  },
  {
    group: "Agricultura",
    titles: ["AGRICULTURA DE PRECISIÓN CON DRONES", "FUMIGACIÓN MEDIANTE RPAS"],
  },
  {
    group: "Inspección",
    titles: [
      "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
      "INSPECCIÓN DE TORRES AT, MT Y TELECOMUNICACIONES",
    ],
  },
];

export const ALL_COURSE_TITLES = COURSE_TITLE_GROUPS.flatMap((group) => group.titles);

/** Forma comparable: sin tildes, en mayúsculas, sin puntuación ni «CURSO» delante. */
export const courseTitleKey = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/&/g, " Y ")
    .replace(/[():,.;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^CURSO( DE)? /, "");

/** Variantes del historial que corresponden a un título del catálogo. */
const ALIASES: Record<string, string> = {
  "OPERADOR DE DRONES OPERADOR DE DRONES": "OPERADOR DE DRONES",
  "OPERADOR DE DRONES PROFESIONAL": "OPERADOR PROFESIONAL DE DRONES",
  "OPERADOR DE DRONES NOCRUTNO": "OPERADOR DE DRONES NOCTURNO",
  "INSTRUCTOR DE RPAS": "INSTRUCTOR DE DRONES",
  "SEGURIDAD CON DRONES": "SEGURIDAD AÉREA CON DRONES",
  "FOTOGRAMETRIA CON DRONES": "FOTOGRAMETRÍA MEDIANTE RPAS",
  "FOTOGRAMETRIA MEDIANTE DRONES": "FOTOGRAMETRÍA MEDIANTE RPAS",
  "LOTEO DE TERRENOS MASTER PLAN 360° CON DRONES": "MÁSTER PLAN 360° CON DRONES",
  "USO Y OPERACION WINGTRA GEN II": "OPERACIÓN WINGTRA GEN II",
  "AGRICULTURA DE PRECISION": "AGRICULTURA DE PRECISIÓN CON DRONES",
  "FUMIGACION CON DRONES": "FUMIGACIÓN MEDIANTE RPAS",
  "INSPECCION VISUAL Y TERMOGRAFICA DE FV MEDIANTE RPAS": "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
  "INSPECCION VISUAL Y TERMOGRAFICA EN PANELES SOLARES CON DRONES": "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
  "INSPECCION VISUAL Y TERMOGRAFICA EN PANELES SOLARES": "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
  "INSPECCION EN PANELES SOLARES CON DRONES": "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
  "INSPECCION DE PANELES SOLARES": "INSPECCIÓN VISUAL Y TERMOGRÁFICA DE PANELES SOLARES MEDIANTE RPAS",
  "INSPECCION DE TORRES AT MT Y TELECOM": "INSPECCIÓN DE TORRES AT, MT Y TELECOMUNICACIONES",
  "INSPECCION EN ALTURA TORRES DE ALTA Y MEDIA TENSION Y TORRES DE TELECOMUNICACION":
    "INSPECCIÓN DE TORRES AT, MT Y TELECOMUNICACIONES",
};

const CANONICAL_BY_KEY = new Map<string, string>([
  ...ALL_COURSE_TITLES.map((title) => [courseTitleKey(title), title] as const),
  ...Object.entries(ALIASES).map(([alias, title]) => [courseTitleKey(alias), title] as const),
]);

/** Título del catálogo al que corresponde un texto (del historial o escrito a mano), o null. */
export const matchCourseTitle = (value: string): string | null => {
  const key = courseTitleKey(value);
  return key ? (CANONICAL_BY_KEY.get(key) ?? null) : null;
};
