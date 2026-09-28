/** Estado operacional de una aeronave, tal como se guarda en `drones.operational_status`. */
export type DroneOperationalStatus = "operational" | "non_operational";

interface DroneStatusStyle {
  label: string;
  /** Insignia compacta: tabla de gestión y ficha pública. */
  className: string;
  /** Opción marcada en el formulario. */
  selectedClassName: string;
  dotClassName: string;
}

export const DRONE_STATUS: Record<DroneOperationalStatus, DroneStatusStyle> = {
  operational: {
    label: "Operacional",
    className: "bg-green-500/15 text-green-400 border-green-500/30",
    selectedClassName: "bg-green-500/20 border-green-500 text-green-300 shadow-lg shadow-green-500/10",
    dotClassName: "bg-green-500",
  },
  non_operational: {
    label: "No operacional",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    selectedClassName: "bg-red-500/20 border-red-500 text-red-300 shadow-lg shadow-red-500/10",
    dotClassName: "bg-red-500",
  },
};

/** Filas antiguas o valores inesperados cuentan como operacionales, igual que el valor por defecto de la columna. */
export const normalizeDroneStatus = (value: unknown): DroneOperationalStatus =>
  value === "non_operational" ? "non_operational" : "operational";
