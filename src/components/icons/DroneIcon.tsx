import { forwardRef, type SVGProps } from "react";

/**
 * Dron multirrotor visto de frente, dibujado con las mismas reglas que los
 * iconos de lucide (cuadrícula 24×24, trazo 2, extremos redondeados) para
 * convivir con ellos en la barra lateral. lucide no incluye ningún dron.
 */
const DroneIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(function DroneIcon(props, ref) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2 4h7M15 4h7" />
      <path d="M5.5 4v5M18.5 4v5" />
      <path d="M5.5 9h13" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
      <path d="m9.5 15-2.5 4.5M14.5 15l2.5 4.5" />
    </svg>
  );
});

export default DroneIcon;
