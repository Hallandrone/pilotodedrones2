/**
 * Series de aeronaves que puede acreditar un diploma.
 *
 * Son familias, no modelos: «MAVIC» cubre Mavic 2, Mavic 3, Mavic 3
 * Enterprise y también Air y Mini (nacieron como Mavic Air y Mavic Mini);
 * «LITO» cubre Lito 1 y Lito X1; «MATRICE» cubre M30, M300, M350 y M4;
 * «DOCK» cubre Dock 1, 2 y 3. En el
 * diploma se imprimen tal cual, en mayúsculas y sin marca («DRAGONFISH»,
 * no «AUTEL DRAGONFISH»), tras «Certificado en la serie:».
 */
export interface DroneSeriesOption {
  /** Texto que se guarda y se imprime. */
  value: string;
  /** Texto del chip en el formulario. */
  label: string;
}

export interface DroneSeriesBrand {
  brand: string;
  options: DroneSeriesOption[];
}

const option = (label: string): DroneSeriesOption => ({ value: label, label });

export const DRONE_SERIES_CATALOG: DroneSeriesBrand[] = [
  {
    brand: "DJI",
    options: [
      "MAVIC",
      "LITO",
      "NEO",
      "FLIP",
      "AVATA",
      "FPV",
      "SPARK",
      "PHANTOM",
      "INSPIRE",
      "MATRICE",
      "AGRAS",
      "FLYCART",
      "DOCK",
    ].map(option),
  },
  {
    brand: "Autel",
    options: ["EVO", "EVO LITE", "EVO NANO", "EVO MAX", "ALPHA", "DRAGONFISH"].map(option),
  },
];

const CATALOG_VALUES = new Set(DRONE_SERIES_CATALOG.flatMap((brand) => brand.options.map((option) => option.value)));

const normalizeToken = (token: string): string =>
  token
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^AUTEL ROBOTICS? /, "AUTEL ")
    .replace(/ SERIES?$/, "");

/** «MAVIC, MATRICE Y PHANTOM»: así se imprime tras «Certificado en la serie:». */
export const composeDroneSeries = (items: string[]): string => {
  const unique = [...new Set(items.map(normalizeToken).filter(Boolean))];
  if (unique.length <= 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} Y ${unique[unique.length - 1]}`;
};

/**
 * Recupera la selección desde un texto guardado, incluidos los formatos
 * antiguos escritos a mano («matrice-mavic», «Mavic, Phantom, Matrice»,
 * «MAVIC, MATRICE Y AGRAS SERIES», «AUTEL EVO»). Lo que no está en el
 * catálogo queda en `other` para el campo manual.
 */
export const parseDroneSeries = (value: string): { selected: string[]; other: string } => {
  const tokens = value
    .split(/\s*[,;/\-–]\s*|\s+y\s+/i)
    .map(normalizeToken)
    .filter(Boolean);
  const selected: string[] = [];
  const other: string[] = [];
  for (const token of tokens) {
    const bare = token.replace(/^AUTEL /, "");
    const candidate = CATALOG_VALUES.has(token) ? token : CATALOG_VALUES.has(bare) ? bare : null;
    if (candidate) {
      if (!selected.includes(candidate)) selected.push(candidate);
    } else if (!other.includes(token)) {
      other.push(token);
    }
  }
  return { selected, other: other.join(", ") };
};
