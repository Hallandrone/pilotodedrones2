import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { generarKmzDjiFly, leerMisionDji, leerPlantilla, MAXIMO_PUNTOS_DJI_FLY } from "./djiFly";
import { destino, distanciaYRumbo, rumboDji } from "./geodesia";
import { exportarKml, importarArchivo } from "./kml";
import { aglTramo, alturaAgl, DAN151, revisarMision } from "./normativa";
import { AJUSTES_POR_DEFECTO, type Mision } from "./tipos";

// Misión de 2 puntos con la estructura que escribe DJI Fly (coordenadas de ejemplo en Santiago).
const TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:author>fly</wpml:author>
    <wpml:createTime>1793204524327</wpml:createTime>
    <wpml:updateTime>1793204524328</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>2.5</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
  </Document>
</kml>
`;

const placemark = (lon: number, lat: number, i: number, acciones: string, giro = "toPointAndStopWithContinuityCurvature") => `      <Placemark>
        <Point>
          <coordinates>
            ${lon},${lat}
          </coordinates>
        </Point>
        <wpml:index>${i}</wpml:index>
        <wpml:executeHeight>${i ? 7.5 : 1}</wpml:executeHeight>
        <wpml:waypointSpeed>2.5</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>smoothTransition</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>152.2</wpml:waypointHeadingAngle>
          <wpml:waypointPoiPoint>0.000000,0.000000,0.000000</wpml:waypointPoiPoint>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
          <wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode>
          <wpml:waypointHeadingPoiIndex>0</wpml:waypointHeadingPoiIndex>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${giro}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>0</wpml:useStraightLine>
${acciones}        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
      </Placemark>`;

const ACCIONES_PRIMERO = `        <wpml:actionGroup>
          <wpml:actionGroupId>1</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>0</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>1</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>0</wpml:gimbalPitchRotateAngle>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
        <wpml:actionGroup>
          <wpml:actionGroupId>2</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>1</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>parallel</wpml:actionGroupMode>
          <wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>2</wpml:actionId>
            <wpml:actionActuatorFunc>gimbalEvenlyRotate</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:gimbalPitchRotateAngle>0</wpml:gimbalPitchRotateAngle>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
`;

const WAYLINES = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.uav.com/wpmz/1.0.2">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode>
      <wpml:finishAction>goHome</wpml:finishAction>
      <wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
      <wpml:globalTransitionalSpeed>2.5</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>68</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>0</wpml:droneSubEnumValue>
      </wpml:droneInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>0</wpml:distance>
      <wpml:duration>0</wpml:duration>
      <wpml:autoFlightSpeed>2.5</wpml:autoFlightSpeed>
${placemark(-70.65, -33.45, 0, ACCIONES_PRIMERO)}
${placemark(-70.6495, -33.4505, 1, "")}
    </Folder>
  </Document>
</kml>
`;

const UUID = "0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D";

async function kmzPlantilla(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("wpmz/template.kml", TEMPLATE, { createFolders: false });
  zip.file("wpmz/waylines.wpml", WAYLINES, { createFolders: false });
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function mision(coords: [number, number][], ajustes = {}): Mision {
  return {
    nombre: "Prueba",
    despegue: null,
    ajustes: { ...AJUSTES_POR_DEFECTO, ...ajustes },
    waypoints: coords.map(([lon, lat], i) => ({ id: `w${i}`, lon, lat, altura: 40 + i * 5 })),
  };
}

const valores = (texto: string, etiqueta: string) => [...texto.matchAll(new RegExp(`<wpml:${etiqueta}>([^<]*)<`, "g"))].map((m) => m[1]);

describe("plantilla de DJI Fly", () => {
  it("toma el UUID del nombre aunque el navegador le agregue «(1)»", async () => {
    const p = await leerPlantilla(await kmzPlantilla(), `${UUID} (1).kmz`);
    expect(p.uuid).toBe(UUID);
    expect(p.modelo).toBe("68");
    expect(p.puntos).toBe(2);
    expect(p.entradas.map((e) => e.nombre)).toEqual(["wpmz/template.kml", "wpmz/waylines.wpml"]);
  });

  it("rechaza un KMZ que no es una misión de DJI", async () => {
    const zip = new JSZip();
    zip.file("doc.kml", "<kml/>");
    await expect(leerPlantilla(await zip.generateAsync({ type: "uint8array" }), "PTO1.kmz")).rejects.toThrow(/no es una misión de DJI/);
  });
});

describe("generarKmzDjiFly", () => {
  const ruta: [number, number][] = [[-70.6, -33.4], [-70.599, -33.4], [-70.599, -33.401]];

  it("arma la misión sobre la plantilla y la nombra <UUID>.kmz", async () => {
    const p = await leerPlantilla(await kmzPlantilla(), `${UUID}.kmz`);
    const r = await generarKmzDjiFly(p, mision(ruta, { velocidad: 6, detenerEnPuntos: false, alTerminar: "autoLand", perdidaSenal: "continuar", camara: -45 }));
    expect(r.nombre).toBe(`${UUID}.kmz`);
    expect(valores(r.waylines, "index")).toEqual(["0", "1", "2"]);
    expect(valores(r.waylines, "executeHeight")).toEqual(["40", "45", "50"]);
    expect(valores(r.waylines, "waypointSpeed")).toEqual(["6", "6", "6"]);
    expect(valores(r.waylines, "autoFlightSpeed")).toEqual(["6"]);
    expect(valores(r.waylines, "waypointTurnMode")).toEqual([
      "toPointAndStopWithContinuityCurvature",
      "toPointAndPassWithContinuityCurvature",
      "toPointAndStopWithContinuityCurvature",
    ]);
    // Rumbo hacia el siguiente punto: este, sur y el último mantiene el sur
    expect(valores(r.waylines, "waypointHeadingAngle")).toEqual(["90", "-180", "-180"]);
    expect(valores(r.waylines, "gimbalPitchRotateAngle")).toEqual(["-45", "-45"]);
    expect(valores(r.waylines, "waypointGimbalPitchAngle")).toEqual(["-45", "-45", "-45"]);
    expect(Math.max(...valores(r.waylines, "actionGroup(?:Start|End)Index").map(Number))).toBeLessThanOrEqual(1);
    for (const t of [r.waylines, r.template]) {
      expect(valores(t, "finishAction")).toEqual(["autoLand"]);
      expect(valores(t, "exitOnRCLost")).toEqual(["goContinue"]);
    }
    expect(valores(r.template, "updateTime")[0]).not.toBe("1793204524328");
    expect(r.waylines).toContain("-70.599,-33.401");

    // El KMZ conserva las entradas de la plantilla, sin carpetas agregadas
    const zip = await JSZip.loadAsync(r.bytes);
    expect(Object.keys(zip.files)).toEqual(["wpmz/template.kml", "wpmz/waylines.wpml"]);
  });

  it("se puede volver a leer como misión", async () => {
    const p = await leerPlantilla(await kmzPlantilla(), `${UUID}.kmz`);
    const r = await generarKmzDjiFly(p, mision(ruta, { velocidad: 4, alTerminar: "gotoFirstWaypoint" }));
    const { mision: leida, avisos } = leerMisionDji(await leerPlantilla(r.bytes, r.nombre));
    expect(avisos).toEqual([]);
    expect(leida.waypoints.map((w) => [w.lon, w.lat, w.altura])).toEqual([
      [-70.6, -33.4, 40],
      [-70.599, -33.4, 45],
      [-70.599, -33.401, 50],
    ]);
    expect(leida.ajustes.velocidad).toBe(4);
    expect(leida.ajustes.alTerminar).toBe("gotoFirstWaypoint");
    expect(leida.ajustes.detenerEnPuntos).toBe(true);
  });

  it("no genera misiones de menos de 2 puntos", async () => {
    const p = await leerPlantilla(await kmzPlantilla(), `${UUID}.kmz`);
    await expect(generarKmzDjiFly(p, mision([[-70.6, -33.4]]))).rejects.toThrow(/al menos 2 puntos/);
  });

  it("genera hasta el máximo de puntos de DJI Fly y no uno más", async () => {
    const p = await leerPlantilla(await kmzPlantilla(), `${UUID}.kmz`);
    const linea = (n: number) => Array.from({ length: n }, (_, i): [number, number] => [-70.6 + i * 0.0001, -33.4]);
    const r = await generarKmzDjiFly(p, mision(linea(MAXIMO_PUNTOS_DJI_FLY)));
    expect(valores(r.waylines, "index")).toHaveLength(MAXIMO_PUNTOS_DJI_FLY);
    await expect(generarKmzDjiFly(p, mision(linea(MAXIMO_PUNTOS_DJI_FLY + 1)))).rejects.toThrow(/hasta 500 puntos por misión y esta tiene 501/);
  });
});

describe("importarArchivo", () => {
  it("reconoce una misión de DJI y la deja como plantilla", async () => {
    const r = await importarArchivo(await kmzPlantilla(), `${UUID}.kmz`);
    expect(r.tipo).toBe("dji");
    if (r.tipo === "dji") {
      expect(r.plantilla.uuid).toBe(UUID);
      expect(r.mision.waypoints).toHaveLength(2);
      expect(r.mision.ajustes.velocidad).toBe(2.5);
    }
  });

  it("lee puntos, líneas y polígonos de Google Earth", async () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Inspección.kml</name>
      <Placemark><name>Línea</name><LineString><coordinates>-70.6,-33.4,0 -70.59,-33.4,0</coordinates></LineString></Placemark>
      <Placemark><name>Cuartel</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-70.6,-33.4,0 -70.59,-33.4,0 -70.59,-33.41,0 -70.6,-33.4,0</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
      <Placemark><name>P1</name><Point><coordinates>-70.61,-33.42,0</coordinates></Point></Placemark>
      <Placemark><name>P2</name><Point><coordinates>-70.62,-33.43,0</coordinates></Point></Placemark>
    </Document></kml>`;
    const r = await importarArchivo(new TextEncoder().encode(kml), "Inspección.kml");
    expect(r.tipo).toBe("kml");
    if (r.tipo === "kml") {
      expect(r.nombre).toBe("Inspección");
      expect(r.opciones.map((o) => o.etiqueta)).toEqual([
        "Todos los puntos en orden (2)",
        "Línea (línea, 2 puntos)",
        "Cuartel (polígono, 3 puntos)",
        "P1 (punto, 1 punto)",
        "P2 (punto, 1 punto)",
      ]);
    }
  });

  it("lee el KML que viene dentro de un KMZ de Google Earth", async () => {
    const zip = new JSZip();
    zip.file("doc.kml", `<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>PTO</name><Point><coordinates>-73.78,-42.19,0</coordinates></Point></Placemark></Document></kml>`);
    const r = await importarArchivo(await zip.generateAsync({ type: "uint8array" }), "PTO.kmz");
    expect(r.tipo === "kml" && r.opciones[0].coords).toEqual([[-73.78, -42.19]]);
  });
});

describe("revisarMision", () => {
  it("exige al menos 2 puntos", () => {
    expect(revisarMision(mision([[-70.6, -33.4]]))[0]).toMatchObject({ nivel: "error" });
  });

  it("acorta las listas largas de puntos", () => {
    const m = mision(Array.from({ length: 10 }, (_, i) => [-70.6 + i * 0.0001, -33.4] as [number, number]));
    m.waypoints.forEach((w) => (w.altura = 0));
    expect(revisarMision(m).map((a) => a.texto)).toContain("Altura de 0 m o menos en los puntos 1, 2, 3, 4, 5 y 5 más.");
  });

  it("sin relieve compara con el despegue y avisa fuera de 500 m (DAN 151)", () => {
    const m = mision([[-70.6, -33.4], destino([-70.6, -33.4], 600, 90)]);
    m.waypoints[1].altura = 130;
    const textos = revisarMision(m).map((a) => a.texto).join(" | ");
    expect(textos).toContain(`Más de ${DAN151.alturaMaximaAgl} m sobre el despegue en el punto 2. Sin datos de relieve no se puede calcular la altura AGL`);
    expect(textos).toMatch(/se aleja 600 m del primer punto/);
  });

  it("con relieve mide AGL bajo cada punto", () => {
    const m = mision([[-70.6, -33.4], [-70.599, -33.4]]);
    // El punto 2 está sobre un cerro 38 m más alto que el despegue: 45 - 38 = 7 m AGL
    const terreno = { despegue: 500, puntos: [500, 538] };
    expect(revisarMision(m, terreno).map((a) => a.texto).join(" ")).toContain("Menos de 10 m AGL en el punto 2");
    expect(alturaAgl(m, terreno, 1)).toBe(7);
  });

  it("con relieve avisa sobre 120 m AGL aunque la altura sobre el despegue sea menor", () => {
    const m = mision([[-70.6, -33.4], [-70.599, -33.4]]);
    // El punto 2 está sobre una quebrada 90 m más baja que el despegue: 45 + 90 = 135 m AGL
    const textos = revisarMision(m, { despegue: 500, puntos: [500, 410] }).map((a) => a.texto).join(" ");
    expect(textos).toContain(`Más de ${DAN151.alturaMaximaAgl} m AGL en el punto 2`);
  });

  it("avisa cuando un punto queda bajo el terreno", () => {
    const m = mision([[-70.6, -33.4], [-70.599, -33.4]]);
    // El punto 2 está sobre un cerro 80 m más alto que el despegue y vuela a 45 m del despegue
    const textos = revisarMision(m, { despegue: 500, puntos: [500, 580] }).map((a) => a.texto).join(" ");
    expect(textos).toContain("El punto 2 queda bajo el nivel del terreno");
  });

  it("revisa el relieve entre los puntos: un cerro y una quebrada en medio de los tramos", () => {
    // Alturas sobre el despegue: 40, 45 y 50 m
    const m = mision([[-70.6, -33.4], [-70.599, -33.4], [-70.598, -33.4]]);
    const terreno = {
      despegue: 500,
      puntos: [500, 500, 500],
      tramos: [
        // Cerro de 70 m a mitad del tramo 1-2: el dron va a 42,5 m y queda 27,5 m bajo la cima
        [{ f: 0.25, suelo: 520 }, { f: 0.5, suelo: 570 }, { f: 0.75, suelo: 520 }],
        // Quebrada de 100 m a mitad del tramo 2-3: el dron pasa a 147,5 m AGL
        [{ f: 0.5, suelo: 400 }],
      ],
    };
    const textos = revisarMision(m, terreno).map((a) => a.texto).join(" | ");
    expect(textos).toContain("En el tramo 1–2 la ruta pasa bajo el terreno");
    expect(textos).toContain("En el tramo 2–3 la ruta supera los 120 m AGL al cruzar terreno más bajo (hasta 148 m AGL)");
    expect(aglTramo(m, terreno, 0)).toEqual({ min: -27.5, max: 23.75 });
  });
});

describe("geodesia", () => {
  it("destino y distancia son coherentes", () => {
    const b = destino([-73.787, -42.194], 20, 0);
    const r = distanciaYRumbo([-73.787, -42.194], b);
    expect(r.d).toBeCloseTo(20, 6);
    expect(r.rumbo).toBeCloseTo(0, 6);
  });

  it("pasa los rumbos al rango de DJI", () => {
    expect(rumboDji(90)).toBe(90);
    expect(rumboDji(270)).toBe(-90);
    expect(rumboDji(359.96)).toBe(-0);
  });
});

describe("exportarKml", () => {
  it("escapa el nombre y lista la ruta", () => {
    const k = exportarKml({ ...mision([[-70.6, -33.4], [-70.59, -33.4]]), nombre: "Línea <norte> & sur" });
    expect(k).toContain("<name>Línea &lt;norte&gt; &amp; sur</name>");
    expect(k).toContain("-70.6,-33.4,40 -70.59,-33.4,45");
  });
});
