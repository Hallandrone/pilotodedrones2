import { useState } from "react";
import { AlertTriangle, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { camaraDe, MODELOS, recordarCamara, type AppVuelo } from "@/lib/misiones/camaras";
import { MAXIMO_PUNTOS_DJI_FLY } from "@/lib/misiones/djiFly";
import { formatoDistancia, formatoDuracion } from "@/lib/misiones/geodesia";
import {
  alturaParaGsd,
  CAMARA_PERSONALIZADA,
  fovDiagonal,
  gsdCm,
  obturacionMinima,
  velocidadMaxima,
  type AjustesMapeo,
  type Camara,
  type EstadoTerreno,
  type GrillaMapeo,
} from "@/lib/misiones/mapeo";
import type { Mision } from "@/lib/misiones/tipos";

interface Props {
  mision: Mision;
  grilla: GrillaMapeo | null;
  cambiar: (cambio: (m: Mision) => Mision, registrar?: boolean) => void;
  /** null = no se está siguiendo el terreno. */
  estadoTerreno: EstadoTerreno | null;
}

const PERSONALIZADA = "personalizada";
const APPS: AppVuelo[] = ["DJI Fly", "DJI Pilot 2", "Otra app"];
const acotar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const redondear = (v: number, decimales = 1) => Math.round(v * 10 ** decimales) / 10 ** decimales;
const coma = (v: number, decimales = 1) => redondear(v, decimales).toLocaleString("es-CL");

const Campo = ({ etiqueta, children, ayuda }: { etiqueta: string; children: React.ReactNode; ayuda?: React.ReactNode }) => (
  <div className="space-y-1">
    <Label className="block text-xs font-semibold text-[#E0E0E0]">{etiqueta}</Label>
    {children}
    {ayuda && <p className="text-[11px] text-[#8A8A8A]">{ayuda}</p>}
  </div>
);

const Dato = ({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-[#333333] py-1.5 last:border-0">
    <dt className="text-xs text-[#B0B0B0]">{etiqueta}</dt>
    <dd className={`text-sm font-semibold tabular-nums ${alerta ? "text-amber-300" : "text-[#E0E0E0]"}`}>{valor}</dd>
  </div>
);

const Opciones = <T extends string>({ id, valor, opciones, onCambio }: { id: string; valor: T; opciones: { valor: T; texto: string }[]; onCambio: (v: T) => void }) => (
  <div id={id} className="grid grid-cols-2 gap-1 rounded-lg bg-[#2C2C2C] p-1" role="group">
    {opciones.map((o) => (
      <button
        key={o.valor}
        type="button"
        aria-pressed={valor === o.valor}
        onClick={() => onCambio(o.valor)}
        className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${valor === o.valor ? "bg-[#00b3f3] text-white" : "text-[#B0B0B0] hover:text-white"}`}
      >
        {o.texto}
      </button>
    ))}
  </div>
);

const PanelMapeo = ({ mision, grilla, cambiar, estadoTerreno }: Props) => {
  const [minutosBateria, setMinutosBateria] = useState(20);
  const m = mision.mapeo!;
  const ajustar = (cambio: Partial<AjustesMapeo>, registrar = true) => cambiar((x) => ({ ...x, mapeo: { ...x.mapeo!, ...cambio } }), registrar);
  const elegirCamara = (camara: Camara, intervaloMinimo?: number) => {
    ajustar(intervaloMinimo ? { camara, intervaloMinimo } : { camara });
    recordarCamara(camara);
  };
  const ajustarCamara = (cambio: Partial<Camara>) => elegirCamara({ ...m.camara, ...cambio, nombre: CAMARA_PERSONALIZADA.nombre });

  const modelo = MODELOS.find((x) => m.camara.nombre.startsWith(`${x.nombre} · `));
  const resolucion = modelo?.resoluciones.find((r) => m.camara.nombre === `${modelo.nombre} · ${r.etiqueta}`);
  const gsd = gsdCm(m.camara, m.altura);
  const velocidad = mision.ajustes.velocidad;
  const vMax = grilla ? velocidadMaxima(grilla, m.intervaloMinimo) : null;
  const segundos = grilla ? grilla.distancia / velocidad : null;
  const baterias = segundos ? Math.ceil(segundos / 60 / minutosBateria) : null;
  const puntosRuta = estadoTerreno?.ruta?.waypoints.length ?? (grilla ? grilla.pasadas.length * 2 : 0);

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-xl border border-[#333333] bg-[#212121] p-3">
        <p className="text-sm text-[#E0E0E0]">
          <span className="font-semibold">Área:</span> {m.poligono.length} {m.poligono.length === 1 ? "vértice" : "vértices"}
          {grilla && ` · ${coma(grilla.areaHa, 2)} ha`}
        </p>
        <p className="text-xs text-[#8A8A8A]">
          Haz clic en el mapa para marcar los vértices del área, en orden. Arrastra un vértice para moverlo. También puedes usar un polígono de
          Google Earth desde la pestaña Archivos.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#333333]"
            disabled={!m.poligono.length}
            onClick={() => ajustar({ poligono: m.poligono.slice(0, -1) })}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            Quitar el último vértice
          </Button>
          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" disabled={!m.poligono.length} onClick={() => ajustar({ poligono: [] })}>
            <Trash2 className="mr-2 h-4 w-4" />
            Borrar el área
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <Campo
          etiqueta="Dron"
          ayuda={
            modelo ? (
              <>
                {modelo.sensor} · {modelo.focalEq} mm equiv. · FOV {coma(modelo.fovDiagonal)}° · obturador {modelo.obturador ?? "no indicado por DJI"} · vuela con{" "}
                {modelo.app}.{" "}
                <a href={modelo.fuente} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#00b3f3]">
                  Ficha de DJI
                </a>
              </>
            ) : (
              `FOV ${coma(fovDiagonal(m.camara), 0)}° calculado desde la focal.`
            )
          }
        >
          <Select
            value={modelo?.nombre ?? PERSONALIZADA}
            onValueChange={(nombre) => {
              const elegido = MODELOS.find((x) => x.nombre === nombre);
              if (elegido) elegirCamara(camaraDe(elegido, elegido.resoluciones[0]), elegido.resoluciones[0].intervaloMinimo);
              else elegirCamara({ ...CAMARA_PERSONALIZADA });
            }}
          >
            <SelectTrigger id="mapeo-dron" className="bg-[#2C2C2C] border-[#333333]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPS.map((app) => {
                const lista = MODELOS.filter((x) => x.app === app);
                return lista.length ? (
                  <SelectGroup key={app}>
                    <SelectLabel>{app === "Otra app" ? "Otras apps (solo cálculo)" : app}</SelectLabel>
                    {lista.map((x) => (
                      <SelectItem key={x.nombre} value={x.nombre}>
                        {x.nombre}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null;
              })}
              <SelectItem value={PERSONALIZADA}>Cámara personalizada</SelectItem>
            </SelectContent>
          </Select>
        </Campo>

        {modelo && modelo.resoluciones.length > 1 && (
          <Campo etiqueta="Resolución de foto">
            <Select
              value={resolucion?.etiqueta}
              onValueChange={(etiqueta) => {
                const r = modelo.resoluciones.find((x) => x.etiqueta === etiqueta)!;
                elegirCamara(camaraDe(modelo, r), r.intervaloMinimo);
              }}
            >
              <SelectTrigger id="mapeo-resolucion" className="bg-[#2C2C2C] border-[#333333]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelo.resoluciones.map((r) => (
                  <SelectItem key={r.etiqueta} value={r.etiqueta}>
                    {r.etiqueta} ({r.anchoPx} × {r.altoPx}
                    {r.derivada ? ", píxeles derivados: DJI no los publica" : ""})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
        )}

        {!modelo && (
          <div className="grid grid-cols-3 gap-2">
            <Campo etiqueta="Focal equiv. (mm)">
              <Input id="mapeo-focal" type="number" min={8} max={200} value={m.camara.focalEq} onChange={(e) => ajustarCamara({ focalEq: acotar(Number(e.target.value) || 24, 8, 200) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
            </Campo>
            <Campo etiqueta="Ancho (px)">
              <Input id="mapeo-ancho" type="number" min={640} value={m.camara.anchoPx} onChange={(e) => ajustarCamara({ anchoPx: Math.max(640, Number(e.target.value) || 4000) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
            </Campo>
            <Campo etiqueta="Alto (px)">
              <Input id="mapeo-alto" type="number" min={480} value={m.camara.altoPx} onChange={(e) => ajustarCamara({ altoPx: Math.max(480, Number(e.target.value) || 3000) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
            </Campo>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta={m.seguirTerreno ? "Altura AGL (m sobre el suelo)" : "Altura (m sobre el despegue)"}>
            <Input id="mapeo-altura" type="number" min={5} max={500} value={m.altura} onChange={(e) => ajustar({ altura: acotar(Number(e.target.value) || 5, 5, 500) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
          </Campo>
          <Campo etiqueta="GSD objetivo (cm/px)">
            <Input
              id="mapeo-gsd"
              type="number"
              min={0.1}
              step={0.1}
              value={redondear(gsd, 2)}
              onChange={(e) => {
                const objetivo = Number(e.target.value);
                if (objetivo > 0) ajustar({ altura: redondear(acotar(alturaParaGsd(m.camara, objetivo), 5, 500), 1) });
              }}
              className="bg-[#2C2C2C] border-[#333333] tabular-nums"
            />
          </Campo>
          <Campo etiqueta="Traslape frontal (%)">
            <Input id="mapeo-frontal" type="number" min={0} max={95} value={m.traslapeFrontal} onChange={(e) => ajustar({ traslapeFrontal: acotar(Number(e.target.value) || 0, 0, 95) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
          </Campo>
          <Campo etiqueta="Traslape lateral (%)">
            <Input id="mapeo-lateral" type="number" min={0} max={95} value={m.traslapeLateral} onChange={(e) => ajustar({ traslapeLateral: acotar(Number(e.target.value) || 0, 0, 95) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
          </Campo>
          <Campo etiqueta="Margen fuera del área (m)">
            <Input id="mapeo-margen" type="number" min={0} max={200} value={m.margen} onChange={(e) => ajustar({ margen: acotar(Number(e.target.value) || 0, 0, 200) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
          </Campo>
          <Campo
            etiqueta="Intervalo entre fotos (s)"
            ayuda={resolucion?.intervaloMinimo ? `DJI publica ${resolucion.intervaloMinimo} s como mínimo de la foto temporizada en ${resolucion.etiqueta}.` : "El mínimo que acepta tu cámara."}
          >
            <Input id="mapeo-intervalo" type="number" min={0.5} max={30} step={0.5} value={m.intervaloMinimo} onChange={(e) => ajustar({ intervaloMinimo: acotar(Number(e.target.value) || 2, 0.5, 30) })} className="bg-[#2C2C2C] border-[#333333] tabular-nums" />
          </Campo>
        </div>

        <Campo etiqueta="Patrón" ayuda={m.patron === "doble" ? "Una segunda grilla cruzada a 90°: el doble de fotos, para modelos 3D." : "Pasadas paralelas: lo justo para un ortomosaico."}>
          <Opciones
            id="mapeo-patron"
            valor={m.patron}
            opciones={[
              { valor: "simple", texto: "Grilla simple" },
              { valor: "doble", texto: "Doble grilla" },
            ]}
            onCambio={(patron) => ajustar({ patron })}
          />
        </Campo>

        <Campo
          etiqueta={`Cámara: ${m.inclinacion}°${m.inclinacion === -90 ? " (cenital)" : " (oblicua)"}`}
          ayuda="-90° para ortomosaicos. Para modelos 3D, doble grilla con la cámara entre -60° y -70°: el dron mira hacia adelante en cada pasada."
        >
          <Slider
            id="mapeo-inclinacion"
            min={-90}
            max={-45}
            step={5}
            value={[m.inclinacion]}
            onValueChange={([v]) => ajustar({ inclinacion: v }, false)}
            onValueCommit={([v]) => ajustar({ inclinacion: v })}
          />
        </Campo>

        <Campo
          etiqueta="Seguir el terreno"
          ayuda={
            m.seguirTerreno
              ? "La altura de cada tramo cambia para mantener la altura AGL sobre el relieve: el GSD queda parejo y la DAN 151 se cumple en pendiente."
              : "Apagado, la grilla vuela a una sola altura sobre el despegue: en pendiente cambian el GSD y la altura sobre el suelo."
          }
        >
          <div className="flex items-center gap-3">
            <Switch id="mapeo-terreno" checked={m.seguirTerreno} onCheckedChange={(seguirTerreno) => ajustar({ seguirTerreno })} />
            {m.seguirTerreno && (
              <>
                <span className="text-xs text-[#B0B0B0]">Tolerancia</span>
                <Input id="mapeo-tolerancia" type="number" min={1} max={20} value={m.tolerancia} onChange={(e) => ajustar({ tolerancia: acotar(Number(e.target.value) || 3, 1, 20) })} className="h-8 w-16 bg-[#2C2C2C] border-[#333333] tabular-nums" />
                <span className="text-xs text-[#B0B0B0]">m</span>
              </>
            )}
          </div>
          {estadoTerreno && (
            <p className={`text-xs ${estadoTerreno.estado === "error" ? "text-red-400" : "text-[#00b3f3]"}`}>
              {estadoTerreno.estado === "cargando" && "Cargando el relieve…"}
              {estadoTerreno.estado === "error" && "No se pudo cargar el relieve de esta zona."}
              {estadoTerreno.estado === "listo" &&
                estadoTerreno.ruta &&
                `${estadoTerreno.ruta.waypoints.length} puntos; altura sobre el despegue de ${coma(estadoTerreno.ruta.minima, 0)} a ${coma(estadoTerreno.ruta.maxima, 0)} m${estadoTerreno.ruta.sinDatos ? ` (${estadoTerreno.ruta.sinDatos} muestras sin relieve)` : ""}.`}
            </p>
          )}
          {estadoTerreno?.ruta && estadoTerreno.ruta.minima <= 0 && estadoTerreno.ruta.puntoMasBajo && (
            <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs text-amber-300">
              <p>
                Parte del área está más abajo que el despegue: DJI Fly mide la altura desde ahí y esos tramos quedarían bajo 0 m. Despega desde la parte baja del
                área o marca otro despegue en la pestaña Misión.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-500/60 text-amber-300"
                onClick={() => {
                  const p = estadoTerreno.ruta!.puntoMasBajo!;
                  cambiar((x) => ({ ...x, despegue: [p[0], p[1]] }));
                }}
              >
                Despegar desde el punto más bajo del área
              </Button>
            </div>
          )}
        </Campo>

        <Campo
          etiqueta="Disparo de las fotos"
          ayuda={
            m.disparo === "temporizada"
              ? "Vuelas la ruta y activas la foto temporizada de DJI Fly: la velocidad se ajusta al intervalo."
              : "Un punto con la acción «tomar foto» en cada disparo. Se activa cuando probemos el formato con tu RC 2."
          }
        >
          <Opciones
            id="mapeo-disparo"
            valor={m.disparo}
            opciones={[
              { valor: "temporizada", texto: "Foto temporizada" },
              { valor: "puntos", texto: "Foto en cada punto" },
            ]}
            onCambio={(disparo) => ajustar({ disparo })}
          />
        </Campo>

        <Campo etiqueta={`Dirección de las pasadas${grilla ? `: ${coma(grilla.direccion, 0)}°` : ""}`}>
          <div className="flex items-center gap-3">
            <Switch id="mapeo-direccion-auto" checked={m.direccion == null} onCheckedChange={(auto) => ajustar({ direccion: auto ? null : grilla?.direccion ?? 0 })} />
            <span className="text-xs text-[#B0B0B0]">Automática (paralela al lado más largo)</span>
            {m.direccion != null && (
              <Input id="mapeo-direccion" type="number" min={0} max={179} value={m.direccion} onChange={(e) => ajustar({ direccion: acotar(Number(e.target.value) || 0, 0, 179) })} className="ml-auto h-8 w-20 bg-[#2C2C2C] border-[#333333] tabular-nums" />
            )}
          </div>
        </Campo>
      </section>

      {grilla ? (
        <section className="rounded-xl border border-[#333333] bg-[#212121] p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#B0B0B0]">Resumen del mapeo</h3>
          <dl>
            <Dato etiqueta="GSD" valor={`${coma(grilla.gsd, 2)} cm/px`} />
            {m.inclinacion > -90 && (
              <Dato etiqueta="GSD al centro de la foto oblicua" valor={`${coma(grilla.gsd / Math.sin((Math.abs(m.inclinacion) * Math.PI) / 180), 2)} cm/px`} />
            )}
            <Dato etiqueta="Huella de cada foto" valor={`${coma(grilla.huella.ancho, 0)} × ${coma(grilla.huella.alto, 0)} m`} />
            <Dato
              etiqueta="Pasadas"
              valor={`${grilla.pasadasPorGrilla.length > 1 ? grilla.pasadasPorGrilla.join(" + ") : grilla.pasadas.length} cada ${coma(grilla.separacionPasadas)} m`}
            />
            <Dato
              etiqueta="Puntos de la ruta"
              valor={`${puntosRuta.toLocaleString("es-CL")} de ${MAXIMO_PUNTOS_DJI_FLY} en DJI Fly`}
              alerta={puntosRuta > MAXIMO_PUNTOS_DJI_FLY}
            />
            <Dato etiqueta="Fotos" valor={`${grilla.fotos.length} cada ${coma(grilla.separacionFotos)} m`} />
            <Dato etiqueta="Distancia de vuelo" valor={formatoDistancia(grilla.distancia)} />
            <Dato etiqueta={`Tiempo a ${coma(velocidad)} m/s`} valor={formatoDuracion(segundos)} />
            <Dato etiqueta="Velocidad máxima por el intervalo" valor={`${coma(vMax ?? 0)} m/s`} alerta={vMax != null && velocidad > vMax} />
            <Dato etiqueta="Obturación mínima" valor={`1/${obturacionMinima(grilla.gsd, velocidad)} s`} />
            <div className="flex items-center justify-between gap-3 py-1.5">
              <dt className="flex items-center gap-2 text-xs text-[#B0B0B0]">
                Baterías de
                <Input id="mapeo-bateria" type="number" min={5} max={60} value={minutosBateria} onChange={(e) => setMinutosBateria(acotar(Number(e.target.value) || 20, 5, 60))} className="h-7 w-14 bg-[#1A1A1A] border-[#333333] px-2 tabular-nums" />
                min útiles
              </dt>
              <dd className="text-sm font-semibold tabular-nums text-[#E0E0E0]">{baterias}</dd>
            </div>
          </dl>
          {vMax != null && velocidad > vMax && (
            <div className="mt-2 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                A {coma(velocidad)} m/s la cámara no alcanza a disparar cada {coma(grilla.separacionFotos)} m.{" "}
                <button className="underline" onClick={() => cambiar((x) => ({ ...x, ajustes: { ...x.ajustes, velocidad: Math.floor(vMax * 10) / 10 } }))}>
                  Usar {coma(Math.floor(vMax * 10) / 10)} m/s
                </button>
              </span>
            </div>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-dashed border-[#333333] p-4 text-sm text-[#B0B0B0]">Marca al menos 3 vértices para ver la grilla de vuelo.</p>
      )}
    </div>
  );
};

export default PanelMapeo;
