// Deterministic LCG PRNG for procedural outline variation
const createPRNG = (seed: number) => {
  let current = seed;
  return () => {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
};

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

// Generates symmetric procedural coordinates relative to center (0, 0) for canvas
// Returns the scaled polygon string for SVG, and the raw relative points for HTML5 Canvas
export const generateVesselGeometry = (ship: any, grid: string[][], worldSeed: string, isCanvas = false) => {
  const seedString = `${worldSeed || 'BOB'}-${ship?.id || 0}-${ship?.chassis || ''}-${ship?.name || ''}`;
  const prng = createPRNG(hashString(seedString));

  // Subtiler, deterministischer Jitter für individuelle Nuancen (im Canvas deaktiviert für Kantenschärfe)
  const jitter = (val: number, maxJitter: number) => {
    if (isCanvas) return val; // No jitter on tiny canvas scale to prevent blurriness
    return val + (prng() * 2 - 1) * maxJitter;
  };

  // Grid pre-processing (Fallback falls leer)
  let activeGrid = grid && grid.length > 0 && grid[0].length > 0 ? grid : [];
  if (activeGrid.length === 0) {
    const hasDrill = ship?.has_drill === 1 || ship?.has_drill === true;
    const hasFab = ship?.has_fabricator === 1 || ship?.has_fabricator === true;
    const hasLogic = ship?.has_logic_core === 1 || ship?.has_logic_core === true;
    activeGrid = [
      [hasDrill ? 'drill' : '', hasLogic ? 'logic_core' : '', ''],
      [hasFab ? 'fabricator' : '', 'reactor', ''],
      ['', 'storage', 'engine']
    ];
  }

  const R = activeGrid.length;
  const C = activeGrid[0].length;
  const midCol = Math.floor(C / 2);

  // Globale Zustandsabfrage für Sonderbauten & Modulzählung
  let hasDrill = ship?.has_drill === 1 || ship?.has_drill === true;
  let numModules = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const cell = activeGrid[r][c] ? activeGrid[r][c].trim().toLowerCase() : '';
      if (cell !== '') numModules++;
      if (cell.includes('drill') || cell.includes('mine')) hasDrill = true;
    }
  }

  // 11 geometrische Konturscheiben (Slices) für die aerodynamische Silhouette (Windschnittige Keilform)
  const slices = [
    { y: -140, baseW: 0,  type: 'nose' },
    { y: -115, baseW: 8,  type: 'bow_shoulder' },  // Schlanker vorn!
    { y: -90,  baseW: 13, type: 'fore_cabin' },
    { y: -60,  baseW: 18, type: 'mid_cabin' },
    { y: -30,  baseW: 22, type: 'mid_hull' },
    { y: 0,    baseW: 24, type: 'center' },
    { y: 30,   baseW: 27, type: 'rear_cabin' },    // Breite Hüften hinten!
    { y: 60,   baseW: 28, type: 'tail_waist' },     // Muskel-Peak vor dem Spoiler
    { y: 85,   baseW: 25, type: 'spoiler' },        // Breiter Spoiler-Ansatz
    { y: 110,  baseW: 12, type: 'nozzle_outer' },   // Fette Triebwerksglocke
    { y: 115,  baseW: 0,  type: 'exhaust_center' }
  ];

  const rightPoints: { x: number; y: number }[] = [];

  // Berechne Deformationen durch Kraftfelder der Grid-Module
  const computedWidths = slices.map(s => {
    let forceX = 0;
    let isSolar = false;
    let isStorage = false;
    let isEngine = false;

    // Verstärkungsfaktor für Kanten-Ausprägungen im winzigen Canvas (z.B. 1.25x Boost)
    const forceMultiplier = isCanvas ? 1.35 : 1.0;

    for (let r = 0; r < R; r++) {
      // Verteile die Zeilen-Zentren im Rumpfbereich zwischen Y = -110 und Y = 85
      const yNode = -110 + r * (195 / Math.max(1, R - 1));
      const rowModules = activeGrid[r];

      for (let c = 0; c < C; c++) {
        const cell = rowModules[c] ? rowModules[c].trim().toLowerCase() : '';
        const colDist = Math.abs(c - midCol);

        // Vertikale Distanz & Gaußscher Einflussradius (sigma = 30)
        const dy = Math.abs(s.y - yNode);
        const sigma = 30;
        const weight = Math.exp(-(dy * dy) / (2 * sigma * sigma));

        if (weight > 0.05) {
          if (cell !== '') {
            // Verbreiterung durch Spaltenversatz im Grid
            forceX += colDist * 14 * weight * forceMultiplier;

            // Spezifische Modul-Kraftwirkungen
            if (cell.includes('solar')) {
              forceX += 28 * weight * forceMultiplier;
              isSolar = true;
            } else if (cell.includes('storage') || cell.includes('cargo') || cell.includes('silo')) {
              forceX += 13 * weight * forceMultiplier;
              isStorage = true;
            } else if (cell.includes('drill') || cell.includes('mine')) {
              forceX += 7 * weight * forceMultiplier;
            } else if (cell.includes('engine') || cell.includes('thrust')) {
              forceX += 13 * weight * forceMultiplier;
              isEngine = true;
            } else if (cell.includes('logic') || cell.includes('core')) {
              forceX -= 5.5 * weight * forceMultiplier; // Kabinen-Tailierung
            } else if (cell.includes('battery')) {
              forceX += 5.5 * weight * forceMultiplier;
            } else {
              forceX += 3 * weight * forceMultiplier;
            }
          } else {
            // Saugkraft leerer Zellen erzeugt aerodynamischen Einzug
            forceX -= 5 * weight * forceMultiplier;
          }
        }
      }
    }

    return {
      y: s.y,
      w: Math.max(6, s.baseW + forceX),
      isSolar,
      isStorage,
      isEngine,
      type: s.type
    };
  });

  // Konstruiere die hochauflösenden, scharfkantigen Vertices
  computedWidths.forEach((slice, idx) => {
    const W = slice.w;

    if (slice.type === 'nose') {
      if (hasDrill) {
        // Aggressiver, gespaltener Front-Splitter (Audi/Ironman-Style)
        rightPoints.push({ x: 0, y: jitter(-115, 2) });
        rightPoints.push({ x: jitter(W * 0.45 + 5, 1), y: jitter(-145, 1) });
      } else {
        // Klassisch spitze, sportliche Cockpit-Nase
        rightPoints.push({ x: 0, y: jitter(-140, 2) });
      }
    } 
    else if (slice.type === 'bow_shoulder') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
    } 
    else if (slice.type === 'fore_cabin') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
    } 
    else if (slice.type === 'mid_cabin') {
      // Stepped Panel Gap (Kante in der Panzerung)
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
      rightPoints.push({ x: jitter(W * 0.92, 1), y: slice.y + 4 }); // Bevel-Stufe nach innen
    } 
    else if (slice.type === 'mid_hull') {
      if (slice.isSolar) {
        // Razor-Blade Solarflügel
        rightPoints.push({ x: jitter(W * 0.5, 1), y: slice.y - 3 });
        rightPoints.push({ x: jitter(W + 15, 2), y: slice.y }); // Dünne, scharfe Spitze
        rightPoints.push({ x: jitter(W * 0.5, 1), y: slice.y + 3 });
      } else if (slice.isStorage) {
        // Muskulöser, flacher Radkasten-Block
        rightPoints.push({ x: jitter(W, 1), y: slice.y - 4 });
        rightPoints.push({ x: jitter(W, 1), y: slice.y + 4 });
      } else {
        rightPoints.push({ x: jitter(W, 1), y: slice.y });
      }
    } 
    else if (slice.type === 'center') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
    } 
    else if (slice.type === 'rear_cabin') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
    } 
    else if (slice.type === 'tail_waist') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
    } 
    else if (slice.type === 'spoiler') {
      if (slice.isEngine) {
        // Ausladende, scharfe Spoiler-Finnen / Triebwerksträger
        rightPoints.push({ x: jitter(W, 1), y: slice.y - 3 });
        rightPoints.push({ x: jitter(W + 10, 1), y: slice.y + 2 });
      } else {
        rightPoints.push({ x: jitter(W, 1), y: slice.y });
      }
    } 
    else if (slice.type === 'nozzle_outer') {
      rightPoints.push({ x: jitter(W, 1), y: slice.y });
      rightPoints.push({ x: jitter(W * 0.3, 1), y: slice.y }); // Bevel-Schnitt zur Triebwerks-Innenseite
    } 
    else if (slice.type === 'exhaust_center') {
      rightPoints.push({ x: 0, y: 115 }); // Abschluss im Zentrum der Düse
    }
  });

  // Fallback-Schutz
  if (rightPoints.length < 3) {
    rightPoints.push({ x: 20, y: 0 });
  }

  // Spiegelung für perfekte Symmetrie der linken Seite
  const leftPoints = rightPoints
    .slice(1, rightPoints.length - 1)
    .reverse()
    .map(p => ({ x: -p.x, y: p.y }));

  const allOuterPoints = [...rightPoints, ...leftPoints];

  // SVG-Pfad-String generieren (Zentriert bei 200, 200)
  const outerString = allOuterPoints.map(p => `${(200 + p.x).toFixed(1)},${(200 + p.y).toFixed(1)}`).join(' ');

  // Innere Skelett-Linien (Doppelhüll-Gitterstruktur, shrunken offset)
  const innerRightPoints = rightPoints.map((p, idx) => {
    if (p.x === 0) {
      return { x: 0, y: idx === 0 ? p.y + 12 : p.y - 12 };
    }
    return {
      x: p.x * 0.65,
      y: p.y + (0 - p.y) * 0.08,
    };
  });
  const innerLeftPoints = innerRightPoints
    .slice(1, innerRightPoints.length - 1)
    .reverse()
    .map(p => ({ x: -p.x, y: p.y }));

  const allInnerPoints = [...innerRightPoints, ...innerLeftPoints];
  const innerString = allInnerPoints.map(p => `${(200 + p.x).toFixed(1)},${(200 + p.y).toFixed(1)}`).join(' ');

  // ----------------------------------------------------
  // GENERIERUNG DER INNEN-KONTUREN / HOCH-KONTRAST-SICKEN
  // Erzeugt Fugenlinien für Cockpit-Haube, Karosseriesicken & Rumpfstruktur (wie Audi R8 Sicken)
  // ----------------------------------------------------
  const W_mid = computedWidths[Math.floor(computedWidths.length / 2)]?.w || 25;
  const panelLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

  // 1. Cockpit-Kanzel (Sportliche, zugespitzte Diamant-Sicke auf der Haube)
  panelLines.push({ x1: 0, y1: -85, x2: W_mid * 0.25, y2: -65 });
  panelLines.push({ x1: W_mid * 0.25, y1: -65, x2: 0, y2: -45 });
  panelLines.push({ x1: 0, y1: -85, x2: -W_mid * 0.25, y2: -65 });
  panelLines.push({ x1: -W_mid * 0.25, y1: -65, x2: 0, y2: -45 });

  // 2. Mittel-Säule / Kiellinie (Trägerstruktur)
  panelLines.push({ x1: 0, y1: -45, x2: 0, y2: 85 });

  // 3. Karosserie-Sicken / Dynamic Side-Blades (Verbindet Schulter mit Heckflügel)
  panelLines.push({ x1: W_mid * 0.35, y1: -30, x2: W_mid * 0.6, y2: 30 });
  panelLines.push({ x1: -W_mid * 0.35, y1: -30, x2: -W_mid * 0.6, y2: 30 });

  // 4. Heck-Sicken (Lüftungsschlitze über dem Triebwerks-Diffusor)
  panelLines.push({ x1: -W_mid * 0.25, y1: 75, x2: W_mid * 0.25, y2: 75 });

  // Physikalische Dimensionen berechnen (Exakt proportional zur visuellen Darstellung, skaliert um Faktor 1.5 für epische Sci-Fi Maße!)
  const maxW = Math.max(...rightPoints.map(p => p.x));
  const lengthMeters = (activeGrid.length * 8 + 12) * 1.5; // Erhöht auf Sci-Fi Standard (z.B. Scout = 54.0m)
  const visualLength = 255; // Gesamte vertikale Spanne des Polygons: 115 - (-140)
  const scaleFactor = lengthMeters / visualLength; // Meter pro Polygon-Einheit
  const widthMeters = (2 * maxW) * scaleFactor; // Gesamte Breite (links + rechts) in Metern

  // Key Landmarks für Detail-Renderings (Textur-Schriften & Flammen)
  const wMid = rightPoints[Math.floor(rightPoints.length / 2)]?.x || 30;
  const yMid = rightPoints[Math.floor(rightPoints.length / 2)]?.y || 0;
  const exhaustY = rightPoints[rightPoints.length - 1]?.y || 115;

  return { 
    outer: outerString, 
    inner: innerString, 
    exhaustY: 200 + exhaustY, 
    wMid, 
    yMid,
    rawPoints: allOuterPoints,
    panelLines,
    lengthMeters,
    widthMeters,
    numModules
  };
};

export const calculateCapabilities = (ship: any, grid: string[][]) => {
  const gridModules = (grid || []).flat().map(m => m ? m.trim().toLowerCase() : '');
  const hasGridDrill = gridModules.some(m => m.includes('drill') || m.includes('mine'));
  const hasGridFab = gridModules.some(m => m.includes('fab') || m.includes('build') || m.includes('assembler'));
  const hasGridLogic = gridModules.some(m => m.includes('logic') || m.includes('core'));
  const hasGridEngine = gridModules.some(m => m.includes('engine') || m.includes('thrust'));
  const hasGridBattery = gridModules.some(m => m.includes('battery') || m.includes('cell'));

  const thrust = ship?.thrust || 0;
  const energyCapacity = ship?.energy_capacity || 0;

  const hasDrill = hasGridDrill || ship?.has_drill === 1 || ship?.has_drill === true;
  const hasFab = hasGridFab || ship?.has_fabricator === 1 || ship?.has_fabricator === true;
  const hasLogic = hasGridLogic || ship?.has_logic_core === 1 || ship?.has_logic_core === true;
  const hasBattery = hasGridBattery || energyCapacity > 0;
  const hasEngine = hasGridEngine || thrust > 0;

  return {
    hasDrill,
    hasFab,
    hasLogic,
    hasBattery,
    hasEngine,
    canMove: !!(hasEngine && hasBattery),
    canDrill: !!(hasDrill && hasBattery),
    canBuild: !!(hasFab && hasBattery)
  };
};
