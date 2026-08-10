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
export const generateVesselGeometry = (ship: any, grid: string[][], worldSeed: string) => {
  const seedString = `${worldSeed || 'BOB'}-${ship.id}-${ship.chassis || ''}-${ship.name || ''}`;
  const prng = createPRNG(hashString(seedString));

  const rightPoints: { x: number; y: number }[] = [];

  // Build a robust grid to work with. If grid is empty or invalid, build a fallback
  let activeGrid = grid && grid.length > 0 && grid[0].length > 0 ? grid : [];
  if (activeGrid.length === 0) {
    const hasDrill = ship.has_drill === 1 || ship.has_drill === true;
    const hasFab = ship.has_fabricator === 1 || ship.has_fabricator === true;
    const hasLogic = ship.has_logic_core === 1 || ship.has_logic_core === true;
    activeGrid = [
      [hasDrill ? 'drill' : '', hasLogic ? 'logic_core' : '', ''],
      [hasFab ? 'fabricator' : '', 'reactor', ''],
      ['', 'storage', 'engine']
    ];
  }

  const R = activeGrid.length;
  const C = activeGrid[0].length;
  const midCol = Math.floor(C / 2);

  // We want to map the R rows to Y coordinates spanning from Y_start to Y_end
  // For raw relative points, let's keep the standard -130 to +100 scale,
  // we will shrink it when rendering on canvas.
  const yStart = -130;
  const yEnd = 100;
  const yStep = R > 1 ? (yEnd - yStart) / (R - 1) : 0;

  // Let's analyze each row and construct the profile points
  for (let r = 0; r < R; r++) {
    const yRow = yStart + r * yStep + (prng() * 6 - 3); // row center Y with a bit of noise
    const rowModules = activeGrid[r];

    // Find outermost active module on the right side
    let outermostActiveCol = midCol;
    let mainModuleType = '';
    
    for (let c = midCol; c < C; c++) {
      const cell = rowModules[c] ? rowModules[c].trim().toLowerCase() : '';
      if (cell !== '') {
        outermostActiveCol = c;
        mainModuleType = cell;
      }
    }

    // Determine width factor based on column distance from center spine
    const colDistance = outermostActiveCol - midCol;
    let baseWidth = 15 + colDistance * 24;

    // Apply modifiers based on the module type in the outermost cell
    let blockiness = false;
    let isSolar = false;

    if (mainModuleType.includes('drill')) {
      baseWidth += 4;
    } else if (mainModuleType.includes('fab')) {
      baseWidth += 12;
    } else if (mainModuleType.includes('storage') || mainModuleType.includes('cargo') || mainModuleType.includes('silo')) {
      baseWidth += 18;
      blockiness = true;
    } else if (mainModuleType.includes('engine') || mainModuleType.includes('thrust')) {
      baseWidth += 10;
    } else if (mainModuleType.includes('solar')) {
      baseWidth += 25;
      isSolar = true;
    } else if (mainModuleType.includes('logic') || mainModuleType.includes('core')) {
      baseWidth += 6;
    } else if (mainModuleType.includes('battery')) {
      baseWidth += 8;
    }

    // Add seeded randomness to width
    baseWidth += prng() * 6;

    // NOSE / BOW special handling for first row
    if (r === 0) {
      if (mainModuleType.includes('drill')) {
        // Forked nose prongs
        rightPoints.push({ x: 0, y: yRow + 10 }); // center inset
        rightPoints.push({ x: baseWidth + 5, y: yRow - 25 }); // prong tip
        rightPoints.push({ x: baseWidth + 12, y: yRow }); // prong outer shoulder
      } else {
        // pointed nose tip
        rightPoints.push({ x: 0, y: yRow - 10 });
        rightPoints.push({ x: baseWidth, y: yRow });
      }
    } else if (r === R - 1) {
      // ENGINE / TAIL special handling for last row
      rightPoints.push({ x: baseWidth, y: yRow - 5 });
      rightPoints.push({ x: baseWidth - 6, y: yRow + 10 }); // taper nozzle
      rightPoints.push({ x: 0, y: yRow + 15 }); // exhaust base
    } else {
      // MIDDLE ROWS (Body / Wings / Solar Arrays)
      if (isSolar) {
        // Protruding solar array wings
        rightPoints.push({ x: baseWidth - 25, y: yRow - 4 });
        rightPoints.push({ x: baseWidth, y: yRow - 4 });
        rightPoints.push({ x: baseWidth, y: yRow + 8 });
        rightPoints.push({ x: baseWidth - 25, y: yRow + 8 });
      } else if (blockiness) {
        // Bulky cargo container look (rectangular corners)
        rightPoints.push({ x: baseWidth, y: yRow - 5 });
        rightPoints.push({ x: baseWidth, y: yRow + 10 });
      } else if (mainModuleType.includes('engine') || mainModuleType.includes('thrust')) {
        // Wing-mounted engine pod
        rightPoints.push({ x: baseWidth - 8, y: yRow - 8 });
        rightPoints.push({ x: baseWidth + 15, y: yRow + 5 }); // sweeping tip
        rightPoints.push({ x: baseWidth, y: yRow + 15 });
      } else {
        // Standard hull slope
        rightPoints.push({ x: baseWidth, y: yRow });
      }
    }
  }

  // Fallback if we didn't generate enough points for a valid polygon
  if (rightPoints.length < 3) {
    rightPoints.push({ x: 20, y: 0 });
  }

  // Mirror right-side coordinates to generate perfect left-side symmetric coordinates
  const leftPoints = rightPoints
    .slice(1, rightPoints.length - 1)
    .reverse()
    .map(p => ({ x: -p.x, y: p.y }));

  const allOuterPoints = [...rightPoints, ...leftPoints];
  // SVG Strings (centered at 200,200)
  const outerString = allOuterPoints.map(p => `${(200 + p.x).toFixed(1)},${(200 + p.y).toFixed(1)}`).join(' ');

  // Internal structural wireframe lines (shrunken double-hull offset)
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
  // SVG Inner string (centered at 200,200)
  const innerString = allInnerPoints.map(p => `${(200 + p.x).toFixed(1)},${(200 + p.y).toFixed(1)}`).join(' ');

  // Determine key landmarks for rendering details
  const wMid = rightPoints[Math.floor(rightPoints.length / 2)]?.x || 30;
  const yMid = rightPoints[Math.floor(rightPoints.length / 2)]?.y || 0;
  const exhaustY = rightPoints[rightPoints.length - 1]?.y || 115;

  return { 
    outer: outerString, 
    inner: innerString, 
    exhaustY: 200 + exhaustY, 
    wMid, 
    yMid,
    // Provide raw uncentered outer points for Canvas HTML5 rendering!
    rawPoints: allOuterPoints 
  };
};
