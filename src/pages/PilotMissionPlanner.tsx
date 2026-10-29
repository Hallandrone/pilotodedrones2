import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Box, CheckCircle, Layers, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/ui/logo";
import MapaMision, { type EstiloMapa } from "@/components/misiones/MapaMision";
import PanelAjustes from "@/components/misiones/PanelAjustes";
import ListaPuntos from "@/components/misiones/ListaPuntos";
import PanelArchivos from "@/components/misiones/PanelArchivos";
import BibliotecaMisiones from "@/components/misiones/BibliotecaMisiones";
import PanelMapeo from "@/components/misiones/PanelMapeo";
import { useHistorialMision } from "@/hooks/useHistorialMision";
import { leerPlantilla, MAXIMO_PUNTOS_DJI_FLY, type PlantillaDji } from "@/lib/misiones/djiFly";
import { formatoDistancia, formatoDuracion, resumenRuta, type LonLat } from "@/lib/misiones/geodesia";
import { camaraRecordada, intervaloDeCamara } from "@/lib/misiones/camaras";
import { Relieve } from "@/lib/misiones/elevacion";
import {
  generarGrilla,
  grillaAWaypoints,
  MAPEO_POR_DEFECTO,
  muestrasDeGrilla,
  normalizarMapeo,
  rutaConTerreno,
  velocidadMaxima,
  type AjustesMapeo,
  type EstadoTerreno,
} from "@/lib/misiones/mapeo";
import { DAN151, revisarMision, type Aviso, type Terreno } from "@/lib/misiones/normativa";
import { ALTURA_POR_DEFECTO, misionVacia, nuevoId, type Mision } from "@/lib/misiones/tipos";
import type { PlantillaGuardada } from "@/services/misionesService";

const mapeoNuevo = (poligono: AjustesMapeo["poligono"] = []): AjustesMapeo => {
  const camara = camaraRecordada() ?? MAPEO_POR_DEFECTO.camara;
  return { ...MAPEO_POR_DEFECTO, camara, intervaloMinimo: intervaloDeCamara(camara) ?? MAPEO_POR_DEFECTO.intervaloMinimo, poligono };
};

const CLAVE_BORRADOR = "pilotodedrones:planificador:borrador";

/** Número con un decimal y coma decimal, para los textos. */
const coma = (v: number) => (Math.round(v * 10) / 10).toLocaleString("es-CL");

interface Borrador {
  usuario: string;
  misionId: string | null;
  mision: Mision;
}

function leerBorrador(usuario: string): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) ?? "null") as Borrador | null;
    return b?.usuario === usuario && Array.isArray(b.mision?.waypoints) ? b : null;
  } catch {
    return null;
  }
}

const enCampoDeTexto = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable || t.getAttribute("role") === "slider");
};

const PilotMissionPlanner = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<string | null>(null);
  const { mision, cambiar, deshacer, puedeDeshacer, reemplazar } = useHistorialMision(() => misionVacia());
  const [misionId, setMisionId] = useState<string | null>(null);
  const [plantilla, setPlantilla] = useState<PlantillaDji | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [alturaNueva, setAlturaNueva] = useState(ALTURA_POR_DEFECTO);
  const [estilo, setEstilo] = useState<EstiloMapa>("satelite");
  const [tresD, setTresD] = useState(false);
  const [marcandoDespegue, setMarcandoDespegue] = useState(false);
  const [terreno, setTerreno] = useState<Terreno | null>(null);
  const [encuadre, setEncuadre] = useState(0);
  const [pestana, setPestana] = useState("puntos");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/auth");
        return;
      }
      const b = leerBorrador(data.user.id);
      if (b) {
        cambiar(() => ({ ...b.mision, mapeo: b.mision.mapeo ? normalizarMapeo(b.mision.mapeo) : null }), false);
        setMisionId(b.misionId);
        setEncuadre((n) => n + 1);
      }
      setUsuario(data.user.id);
    });
  }, [navigate, cambiar]);

  // El trabajo sin guardar sobrevive a una recarga de la página
  useEffect(() => {
    if (!usuario) return;
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ usuario, misionId, mision } satisfies Borrador));
    } catch {
      // sin almacenamiento local (navegación privada): no hay borrador
    }
  }, [usuario, misionId, mision]);

  const quitarPunto = useCallback(
    (id: string) => {
      cambiar((m) => ({ ...m, waypoints: m.waypoints.filter((w) => w.id !== id) }));
      setSeleccionado(null);
    },
    [cambiar],
  );

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (enCampoDeTexto(e)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        deshacer();
      } else if ((e.key === "Delete" || e.key === "Backspace") && seleccionado) {
        e.preventDefault();
        quitarPunto(seleccionado);
      } else if (e.key === "Escape") {
        setMarcandoDespegue(false);
        setSeleccionado(null);
      }
    };
    window.addEventListener("keydown", teclas);
    return () => window.removeEventListener("keydown", teclas);
  }, [deshacer, quitarPunto, seleccionado]);

  // En un mapeo, la ruta que se vuela (y se revisa y exporta) es la grilla sobre el área
  const modoMapeo = !!mision.mapeo;
  const mapeo = mision.mapeo;
  const grilla = useMemo(() => (mision.mapeo ? generarGrilla(mision.mapeo) : null), [mision.mapeo]);

  // Seguimiento del terreno: relieve de alta resolución y alturas por tramo para un AGL constante
  const relieve = useMemo(() => new Relieve(), []);
  const [terrenoMapeo, setTerrenoMapeo] = useState<(EstadoTerreno & { clave: string }) | null>(null);
  const origenMapeo: LonLat | null = mision.despegue ?? grilla?.pasadas[0]?.[0] ?? null;
  const claveTerreno =
    mapeo?.seguirTerreno && grilla && origenMapeo ? JSON.stringify([grilla.pasadas, mapeo.altura, mapeo.tolerancia, origenMapeo]) : null;
  useEffect(() => {
    if (!claveTerreno || !grilla || !mapeo || !origenMapeo) return;
    let vigente = true;
    setTerrenoMapeo({ clave: claveTerreno, estado: "cargando", ruta: null });
    relieve
      .preparar([origenMapeo, ...muestrasDeGrilla(grilla)])
      .then(() => {
        if (!vigente) return;
        const sueloDespegue = relieve.suelo(origenMapeo[0], origenMapeo[1]);
        if (sueloDespegue == null) throw new Error("sin relieve en el despegue");
        const ruta = rutaConTerreno(grilla, { agl: mapeo.altura, sueloDespegue, tolerancia: mapeo.tolerancia, suelo: (lon, lat) => relieve.suelo(lon, lat) });
        setTerrenoMapeo({ clave: claveTerreno, estado: "listo", ruta });
      })
      .catch(() => vigente && setTerrenoMapeo({ clave: claveTerreno, estado: "error", ruta: null }));
    return () => {
      vigente = false;
    };
    // claveTerreno resume grilla, altura, tolerancia y origen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveTerreno, relieve]);
  const estadoTerreno = useMemo(
    (): EstadoTerreno | null => (claveTerreno ? (terrenoMapeo?.clave === claveTerreno ? terrenoMapeo : { estado: "cargando", ruta: null }) : null),
    [claveTerreno, terrenoMapeo],
  );

  const misionVuelo = useMemo((): Mision => {
    if (!mapeo) return mision;
    const waypoints = !grilla ? [] : estadoTerreno?.ruta ? estadoTerreno.ruta.waypoints : grillaAWaypoints(grilla, mapeo.altura);
    // La grilla define la cámara, el rumbo (de frente a la pasada) y que no se detenga en los puntos intermedios
    return { ...mision, waypoints, ajustes: { ...mision.ajustes, camara: mapeo.inclinacion, rumbo: "siguiente", detenerEnPuntos: false } };
  }, [mision, mapeo, grilla, estadoTerreno]);
  const avisos = useMemo(() => revisarMision(misionVuelo, terreno), [misionVuelo, terreno]);
  const errores = avisos.filter((a) => a.nivel === "error");

  // Lo que además impide exportar a DJI Fly
  const erroresExportacion = useMemo((): Aviso[] => {
    const propios: Aviso[] = [];
    const puntos = misionVuelo.waypoints.length;
    if (puntos > MAXIMO_PUNTOS_DJI_FLY) {
      const salida = !mapeo
        ? "quita puntos o divide la ruta en varias misiones"
        : mapeo.seguirTerreno
          ? `sube la tolerancia del seguimiento del terreno (ahora ${coma(mapeo.tolerancia)} m) o divide el área en varias misiones`
          : "divide el área en varias misiones";
      propios.push({
        nivel: "error",
        texto: `DJI Fly acepta hasta ${MAXIMO_PUNTOS_DJI_FLY} puntos por misión y ${mapeo ? "este mapeo" : "esta ruta"} tiene ${coma(puntos)}: ${salida}.`,
      });
    }
    if (mapeo && grilla) {
      const vMax = velocidadMaxima(grilla, mapeo.intervaloMinimo);
      if (mision.ajustes.velocidad > vMax) {
        propios.push({
          nivel: "error",
          texto: `A ${coma(mision.ajustes.velocidad)} m/s la cámara no alcanza a disparar cada ${coma(grilla.separacionFotos)} m: baja la velocidad a ${coma(Math.floor(vMax * 10) / 10)} m/s o menos.`,
        });
      }
      if (estadoTerreno?.estado === "cargando") propios.push({ nivel: "error", texto: "Esperando el relieve para seguir el terreno." });
      if (estadoTerreno?.estado === "error") propios.push({ nivel: "error", texto: "No se pudo cargar el relieve: desactiva el seguimiento del terreno o reintenta." });
    }
    return [...errores, ...propios];
  }, [errores, misionVuelo.waypoints.length, mapeo, grilla, mision.ajustes.velocidad, estadoTerreno]);
  const resumen = useMemo(
    () => resumenRuta(misionVuelo.waypoints.map((w) => [w.lon, w.lat]), misionVuelo.ajustes.velocidad),
    [misionVuelo.waypoints, misionVuelo.ajustes.velocidad],
  );

  const cambiarModo = (mapeo: boolean) => {
    if (mapeo === modoMapeo) return;
    cambiar((m) => ({ ...m, mapeo: mapeo ? mapeoNuevo() : null }));
    setSeleccionado(null);
    setTerreno(null);
    setPestana("puntos");
  };

  const agregarVertice = useCallback(
    (lon: number, lat: number) => cambiar((m) => (m.mapeo ? { ...m, mapeo: { ...m.mapeo, poligono: [...m.mapeo.poligono, [lon, lat]] } } : m)),
    [cambiar],
  );

  const moverVertice = useCallback(
    (indice: number, lon: number, lat: number) =>
      cambiar((m) => (m.mapeo ? { ...m, mapeo: { ...m.mapeo, poligono: m.mapeo.poligono.map((v, i) => (i === indice ? ([lon, lat] as LonLat) : v)) } } : m)),
    [cambiar],
  );

  const usarComoArea = (coords: LonLat[]) => {
    cambiar((m) => ({ ...m, mapeo: m.mapeo ? { ...m.mapeo, poligono: coords } : mapeoNuevo(coords) }));
    setTerreno(null);
    setPestana("puntos");
    setEncuadre((n) => n + 1);
  };

  const agregarPunto = useCallback(
    (lon: number, lat: number) => {
      const id = nuevoId();
      cambiar((m) => ({ ...m, waypoints: [...m.waypoints, { id, lon, lat, altura: alturaNueva }] }));
      setSeleccionado(id);
    },
    [cambiar, alturaNueva],
  );

  const moverPunto = useCallback(
    (id: string, lon: number, lat: number) => cambiar((m) => ({ ...m, waypoints: m.waypoints.map((w) => (w.id === id ? { ...w, lon, lat } : w)) })),
    [cambiar],
  );

  const marcarDespegue = useCallback(
    (lon: number, lat: number) => {
      cambiar((m) => ({ ...m, despegue: [lon, lat] }));
      setMarcandoDespegue(false);
    },
    [cambiar],
  );

  // La plantilla es del control del piloto, no de la ruta: se mantiene salvo que la misión abierta traiga la suya
  const abrir = (m: Mision, id: string | null, guardada: PlantillaGuardada | null = null) => {
    reemplazar(m);
    setMisionId(id);
    setSeleccionado(null);
    setTerreno(null);
    setEncuadre((n) => n + 1);
    if (guardada) leerPlantilla(guardada.bytes, guardada.nombre).then(setPlantilla, () => setPlantilla(null));
  };

  const agregarPuntos = (coords: LonLat[]) => {
    cambiar((m) => ({ ...m, waypoints: [...m.waypoints, ...coords.map(([lon, lat]) => ({ id: nuevoId(), lon, lat, altura: alturaNueva }))] }));
    setEncuadre((n) => n + 1);
  };

  const plantillaGuardable: PlantillaGuardada | null = plantilla
    ? { nombre: plantilla.uuid ? `${plantilla.uuid}.kmz` : plantilla.nombreArchivo, bytes: plantilla.original }
    : null;

  if (!usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1A1A]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF69B4]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1A1A1A] text-[#E0E0E0] lg:h-screen">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-2xl backdrop-blur-xl lg:static">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/pilot")} className="h-10 w-10 rounded-full text-gray-900 hover:bg-gray-100" aria-label="Volver al panel">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Logo size="lg" showText={false} className="flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-2xl">Planificador de misiones</h1>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-600">Área de Piloto</p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[55vh] lg:h-auto lg:flex-1">
          <MapaMision
            waypoints={misionVuelo.waypoints}
            mostrarPuntos={!modoMapeo}
            poligono={mision.mapeo ? mision.mapeo.poligono : null}
            fotos={grilla?.fotos}
            onAgregarVertice={agregarVertice}
            onMoverVertice={moverVertice}
            despegue={mision.despegue}
            seleccionado={seleccionado}
            estilo={estilo}
            tresD={tresD}
            marcandoDespegue={marcandoDespegue}
            encuadre={encuadre}
            onAgregar={agregarPunto}
            onMover={moverPunto}
            onSeleccionar={setSeleccionado}
            onDespegue={marcarDespegue}
            onTerreno={setTerreno}
          />

          <div className="absolute left-3 top-3 flex gap-2">
            <Button size="sm" variant="secondary" className="bg-[#1A1A1A]/85 text-white hover:bg-[#1A1A1A]" onClick={() => setEstilo(estilo === "satelite" ? "topografico" : "satelite")}>
              <Layers className="mr-2 h-4 w-4" />
              {estilo === "satelite" ? "Topográfico" : "Satélite"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              aria-pressed={tresD}
              className={tresD ? "bg-[#00b3f3] text-white hover:bg-[#0099cc]" : "bg-[#1A1A1A]/85 text-white hover:bg-[#1A1A1A]"}
              onClick={() => setTresD(!tresD)}
            >
              <Box className="mr-2 h-4 w-4" />
              3D
            </Button>
            <Button size="sm" variant="secondary" className="bg-[#1A1A1A]/85 text-white hover:bg-[#1A1A1A]" disabled={!puedeDeshacer} onClick={deshacer} title="Deshacer (Ctrl+Z)">
              <Undo2 className="mr-2 h-4 w-4" />
              Deshacer
            </Button>
          </div>

          {marcandoDespegue && (
            <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-[#00b3f3] px-4 py-2 text-sm font-semibold text-white shadow-lg">
              Haz clic donde vas a despegar · Esc para cancelar
            </div>
          )}

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1A1A1A]/85 px-4 py-2 text-sm text-white shadow-lg tabular-nums">
            {modoMapeo
              ? grilla
                ? `${grilla.fotos.length} fotos · ${grilla.areaHa.toFixed(2).replace(".", ",")} ha · ${formatoDistancia(grilla.distancia)} · ${formatoDuracion(grilla.distancia / mision.ajustes.velocidad)}`
                : "Marca los vértices del área"
              : `${mision.waypoints.length} ${mision.waypoints.length === 1 ? "punto" : "puntos"} · ${formatoDistancia(resumen.total)} · ${formatoDuracion(resumen.segundos)}`}
          </div>
        </div>

        <aside className="w-full border-[#333333] bg-[#1A1A1A] lg:w-[420px] lg:overflow-y-auto lg:border-l">
          <div className="space-y-4 p-4 pb-20">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#2C2C2C] p-1" role="group" aria-label="Tipo de misión">
              {[
                { mapeo: false, texto: "Ruta por puntos" },
                { mapeo: true, texto: "Mapeo de área" },
              ].map((op) => (
                <button
                  key={op.texto}
                  type="button"
                  aria-pressed={modoMapeo === op.mapeo}
                  onClick={() => cambiarModo(op.mapeo)}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${modoMapeo === op.mapeo ? "bg-[#FF69B4] text-white" : "text-[#B0B0B0] hover:text-white"}`}
                >
                  {op.texto}
                </button>
              ))}
            </div>

            <section
              className={`rounded-xl border p-3 ${
                !misionVuelo.waypoints.length ? "border-[#333333] bg-[#212121]" : avisos.length ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"
              }`}
            >
              {!misionVuelo.waypoints.length ? (
                <p className="text-sm text-[#B0B0B0]">{modoMapeo ? "Marca al menos 3 vértices para revisar el vuelo." : "Agrega al menos 2 puntos para revisar la ruta."}</p>
              ) : avisos.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-emerald-400">
                  <CheckCircle className="h-4 w-4" /> Sin observaciones para esta ruta.
                </p>
              ) : (
                <ul className="space-y-2">
                  {avisos.map((a) => (
                    <li key={a.texto} className={`flex gap-2 text-sm ${a.nivel === "error" ? "text-red-400" : "text-amber-300"}`}>
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      {a.texto}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-[11px] leading-snug text-[#8A8A8A]">
                {DAN151.cita}{" "}
                {terreno?.despegue != null
                  ? "El AGL se calcula con el relieve del mapa en cada punto y a lo largo de la ruta; acerca el mapa para más precisión."
                  : "Sin datos de relieve: las alturas solo se comparan con el despegue, no AGL."}
              </p>
            </section>

            <Tabs value={pestana} onValueChange={setPestana}>
              <TabsList className="grid w-full grid-cols-4 bg-[#2C2C2C]">
                <TabsTrigger value="puntos">{modoMapeo ? "Área" : "Puntos"}</TabsTrigger>
                <TabsTrigger value="mision">Misión</TabsTrigger>
                <TabsTrigger value="archivos">Archivos</TabsTrigger>
                <TabsTrigger value="biblioteca">Guardadas</TabsTrigger>
              </TabsList>
              <TabsContent value="puntos" className="pt-2">
                {modoMapeo ? (
                  <PanelMapeo mision={mision} grilla={grilla} cambiar={cambiar} estadoTerreno={estadoTerreno} />
                ) : (
                  <ListaPuntos
                    mision={mision}
                    terreno={terreno}
                    seleccionado={seleccionado}
                    onSeleccionar={setSeleccionado}
                    cambiar={cambiar}
                    alturaNueva={alturaNueva}
                  />
                )}
              </TabsContent>
              <TabsContent value="mision" className="pt-2">
                <PanelAjustes
                  mision={mision}
                  modoMapeo={modoMapeo}
                  cambiar={cambiar}
                  alturaNueva={alturaNueva}
                  setAlturaNueva={setAlturaNueva}
                  marcandoDespegue={marcandoDespegue}
                  setMarcandoDespegue={setMarcandoDespegue}
                />
              </TabsContent>
              <TabsContent value="archivos" className="pt-2">
                <PanelArchivos
                  mision={mision}
                  misionExportar={misionVuelo}
                  bloqueoDji={
                    mapeo?.disparo === "puntos"
                      ? "La foto en cada punto se activa cuando probemos con tu RC 2 cómo escribe DJI Fly la acción «tomar foto». Por ahora usa la foto temporizada (pestaña Área, Disparo)."
                      : null
                  }
                  instruccionesMapeo={
                    mapeo && grilla && mapeo.disparo === "temporizada"
                      ? [
                          `Antes de iniciar la misión, en DJI Fly deja la cámara en foto temporizada cada ${mapeo.intervaloMinimo} s${mapeo.camara.nombre.includes(" · ") ? ` (${mapeo.camara.nombre.split(" · ")[1]})` : ""}.`,
                          "Inicia la misión y activa la foto temporizada cuando el dron llegue al inicio de la primera pasada; detenla al terminar la última.",
                          `La misión vuela a ${coma(mision.ajustes.velocidad)} m/s: así la cámara dispara cada ${coma(mision.ajustes.velocidad * mapeo.intervaloMinimo)} m (la grilla pide como máximo ${coma(grilla.separacionFotos)} m).`,
                          ...(misionVuelo.waypoints.length
                            ? [`Revisa que el límite de altura de DJI Fly permita ${Math.ceil(Math.max(...misionVuelo.waypoints.map((w) => w.altura)))} m sobre el despegue, la altura máxima de esta misión.`]
                            : []),
                          "DJI no describe este procedimiento como oficial: pruébalo primero en un área chica y revisa el traslape de las fotos.",
                        ]
                      : null
                  }
                  plantilla={plantilla}
                  setPlantilla={setPlantilla}
                  errores={erroresExportacion}
                  onReemplazar={(m) => abrir(m, null)}
                  onAgregarPuntos={agregarPuntos}
                  onUsarComoArea={usarComoArea}
                  alturaNueva={alturaNueva}
                />
              </TabsContent>
              <TabsContent value="biblioteca" className="pt-2">
                <BibliotecaMisiones
                  mision={mision}
                  misionId={misionId}
                  plantilla={plantillaGuardable}
                  onGuardada={setMisionId}
                  onAbrir={(id, m, p) => abrir(m, id, p)}
                  onNueva={() => abrir(misionVacia(), null)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PilotMissionPlanner;
