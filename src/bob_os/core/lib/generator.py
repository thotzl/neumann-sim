import math

def int32(val: int) -> int:
    """Emulates JavaScript bitwise conversion to signed 32-bit integer (| 0)."""
    return (val + 2**31) % 2**32 - 2**31

def uint32(val: int) -> int:
    """Emulates JavaScript bitwise conversion to unsigned 32-bit integer (>>> 0)."""
    return val & 0xFFFFFFFF

def math_imul(a: int, b: int) -> int:
    """Emulates JavaScript Math.imul (signed 32-bit multiplication)."""
    return int32((a & 0xFFFFFFFF) * (b & 0xFFFFFFFF))

def kelvinToRGB(kelvin: float) -> dict:
    """
    Converts a Planck color temperature in Kelvin to an RGB object
    using Tanner Helland's high-quality curve-fit approximation (1,000K to 40,000K).
    """
    k = max(1000.0, min(40000.0, float(kelvin)))
    temp = k / 100.0
    r, g, b = 0.0, 0.0, 0.0

    # Calculate Red
    if temp <= 66.0:
        r = 255.0
    else:
        r = temp - 60.0
        r = 329.698727446 * math.pow(r, -0.1332047592)
        if r < 0.0: r = 0.0
        if r > 255.0: r = 255.0

    # Calculate Green
    if temp <= 66.0:
        g = temp
        g = 99.4708025861 * math.log(g) - 161.1195681661
        if g < 0.0: g = 0.0
        if g > 255.0: g = 255.0
    else:
        g = temp - 60.0
        g = 288.1221695283 * math.pow(g, -0.0755148492)
        if g < 0.0: g = 0.0
        if g > 255.0: g = 255.0

    # Calculate Blue
    if temp >= 66.0:
        b = 255.0
    else:
        if temp <= 19.0:
            b = 0.0
        else:
            b = temp - 10.0
            b = 138.5177312231 * math.log(b) - 305.0447927307
            if b < 0.0: b = 0.0
            if b > 255.0: b = 255.0

    return {
        "r": int(round(r)),
        "g": int(round(g)),
        "b": int(round(b))
    }

def getStellarProperties(mass: float) -> dict:
    """
    Main-Sequence Hertzsprung-Russell Physical Relation Engine.
    Derives ALL physical properties deterministically from a single key: Stellar Mass.
    """
    mass = float(mass)
    if mass < 1.0:
        radius = math.pow(mass, 0.8)
    else:
        radius = math.pow(mass, 0.57)

    volume = math.pow(radius, 3.0)

    if mass < 0.43:
        luminosity = 0.23 * math.pow(mass, 2.3)
    elif mass < 2.0:
        luminosity = math.pow(mass, 4.0)
    elif mass < 20.0:
        luminosity = 1.5 * math.pow(mass, 3.5)
    else:
        luminosity = 25.0 * math.pow(mass, 1.8)

    temperature = int(round(5778.0 * math.pow(luminosity / math.pow(radius, 2.0), 0.25)))
    density = mass / volume
    gravity = mass / (radius * radius)
    hazardLevel = math.pow(temperature / 5778.0, 4.5)
    color = kelvinToRGB(temperature)

    return {
        "radius": radius,
        "volume": volume,
        "luminosity": luminosity,
        "temperature": temperature,
        "density": density,
        "gravity": gravity,
        "hazardLevel": hazardLevel,
        "color": color
    }

def getSpectralClassFromTemp(temp: float) -> str:
    """Maps Temperature back into Morgan-Keenan spectral classification."""
    if temp >= 30000: return 'O'
    if temp >= 10000: return 'B'
    if temp >= 7500: return 'A'
    if temp >= 6000: return 'F'
    if temp >= 5200: return 'G'
    if temp >= 3700: return 'K'
    return 'M'

class Mulberry32:
    """32-Bit Mulberry32 PRNG Algorithm replicated from JS."""
    def __init__(self, seed: int):
        self.state = int32(seed)

    def next_val(self) -> float:
        self.state = int32(self.state + 0x6D2B79F5)
        state_u = uint32(self.state)
        t = int32(self.state ^ (state_u >> 15))
        t = math_imul(t, self.state | 1)
        t_u = uint32(t)
        imul_part = math_imul(t ^ (t_u >> 7), t | 61)
        t = int32(t ^ int32(t + imul_part))
        t_u2 = uint32(t)
        return float(uint32(t ^ (t_u2 >> 14)) / 4294967296.0)

def hash_string_to_int(str_val: str) -> int:
    """Converts a string seed into a stable 32-bit integer."""
    if not str_val:
        return 0
    hash_val = 0
    for char in str_val:
        # Shift must be cast to int32 first, matching JavaScript bitwise precedence
        hash_val = int32(int32(hash_val << 5) - hash_val + ord(char))
    return hash_val

class UniverseGenerator:
    """Procedural Universe Generator using hierarchical Galaxy Super-Grids."""

    @classmethod
    def resolve_params(cls) -> dict:
        """Resolves all cosmic parameters from config_service or returns class defaults."""
        try:
            from core.lib import config_service
            conf = config_service.get_config()
            cosmic = conf.get("cosmic_settings", {})
        except Exception:
            cosmic = {}
            
        return {
            "CELL_SIZE": cosmic.get("CELL_SIZE", 500),
            "MAX_JITTER": cosmic.get("MAX_JITTER", 75),
            "SUPER_CELL_SIZE": cosmic.get("SUPER_CELL_SIZE", 120000),
            "GALAXY_CHANCE": cosmic.get("GALAXY_CHANCE", 0.40),
            "MIN_GALAXY_RADIUS": cosmic.get("MIN_GALAXY_RADIUS", 15000),
            "MAX_GALAXY_RADIUS": cosmic.get("MAX_GALAXY_RADIUS", 50000),
            "MIN_PITCH_ANGLE": cosmic.get("MIN_PITCH_ANGLE", 6),
            "MAX_PITCH_ANGLE": cosmic.get("MAX_PITCH_ANGLE", 24),
            "MIN_STELLAR_MASS": cosmic.get("MIN_STELLAR_MASS", 0.08),
            "MAX_STELLAR_MASS": cosmic.get("MAX_STELLAR_MASS", 40.0),
            "STELLAR_MASS_IMF": cosmic.get("STELLAR_MASS_IMF", 3.0),
            "REMNANT_CHANCE": cosmic.get("REMNANT_CHANCE", 0.001),
            "REMNANT_PULSAR_LIMIT": cosmic.get("REMNANT_PULSAR_LIMIT", 15.0),
            "PLANET_MIN_COUNT": cosmic.get("PLANET_MIN_COUNT", 2),
            "PLANET_MAX_COUNT": cosmic.get("PLANET_MAX_COUNT", 8),
            "PLANET_TB_OFFSET": cosmic.get("PLANET_TB_OFFSET", 0.22),
            "PLANET_TB_SPACING": cosmic.get("PLANET_TB_SPACING", 1.45),
            "PLANET_ALBEDO_VULCAN": cosmic.get("PLANET_ALBEDO_VULCAN", 0.12),
            "PLANET_ALBEDO_ROCKY": cosmic.get("PLANET_ALBEDO_ROCKY", 0.20),
            "PLANET_ALBEDO_HAB": cosmic.get("PLANET_ALBEDO_HAB", 0.30),
            "PLANET_ALBEDO_DESERT": cosmic.get("PLANET_ALBEDO_DESERT", 0.25),
            "PLANET_ALBEDO_GAS": cosmic.get("PLANET_ALBEDO_GAS", 0.35),
            "PLANET_ALBEDO_ICE": cosmic.get("PLANET_ALBEDO_ICE", 0.40),
            "SUPERNOVA_BUBBLE_SIZE": cosmic.get("SUPERNOVA_BUBBLE_SIZE", 64000),
            "SUPERNOVA_BUBBLE_CHANCE": cosmic.get("SUPERNOVA_BUBBLE_CHANCE", 0.09),
            "GRAVITY_WELL_SIZE": cosmic.get("GRAVITY_WELL_SIZE", 75000),
            "GRAVITY_WELL_CHANCE": cosmic.get("GRAVITY_WELL_CHANCE", 0.08),
            "GRAVITY_WELL_MULT": cosmic.get("GRAVITY_WELL_MULT", 2.0),
        }

    @classmethod
    def getGalaxyInSuperCell(cls, scx: int, scy: int, worldSeed: int) -> dict:
        p = cls.resolve_params()
        superSeed = int32(math_imul(scx, 73856093) ^ math_imul(scy, 19349663) ^ worldSeed)
        prng = Mulberry32(superSeed)

        isHome = (scx == 0 and scy == 0)

        if not isHome and prng.next_val() > p["GALAXY_CHANCE"]:
            return None

        x, y = 0, 0
        g_type = 'S'

        if isHome:
            angle = prng.next_val() * math.pi * 2.0
            dist = 15000.0 + prng.next_val() * 8000.0
            x = int(round(math.cos(angle) * dist))
            y = int(round(math.sin(angle) * dist))
            g_type = 'S' if prng.next_val() < 0.5 else 'SB'
        else:
            ox = prng.next_val()
            oy = prng.next_val()

            cellCenterX = scx * p["SUPER_CELL_SIZE"] + p["SUPER_CELL_SIZE"] / 2.0
            cellCenterY = scy * p["SUPER_CELL_SIZE"] + p["SUPER_CELL_SIZE"] / 2.0

            x = int(round(cellCenterX + (ox - 0.5) * 0.7 * p["SUPER_CELL_SIZE"]))
            y = int(round(cellCenterY + (oy - 0.5) * 0.7 * p["SUPER_CELL_SIZE"]))

            typeRoll = prng.next_val()
            if typeRoll < 0.35: g_type = 'S'
            elif typeRoll < 0.60: g_type = 'SB'
            elif typeRoll < 0.75: g_type = 'E'
            elif typeRoll < 0.90: g_type = 'L'
            else: g_type = 'Irr'

        radius = int(round(32000.0 + prng.next_val() * 14000.0)) if isHome else \
                 int(round(p["MIN_GALAXY_RADIUS"] + prng.next_val() * (p["MAX_GALAXY_RADIUS"] - p["MIN_GALAXY_RADIUS"])))

        pitchAngle = p["MIN_PITCH_ANGLE"] + prng.next_val() * (p["MAX_PITCH_ANGLE"] - p["MIN_PITCH_ANGLE"])
        pitchRad = pitchAngle * math.pi / 180.0
        b = math.tan(pitchRad)

        numArms = 2 if prng.next_val() < 0.55 else 4
        baseDensity = 0.50 + prng.next_val() * 0.35
        rotation = prng.next_val() * math.pi * 2.0

        smbhMass = 1.0
        if g_type == 'E':
            smbhMass = 4.5 + prng.next_val() * 5.0
        elif g_type == 'SB' or g_type == 'S':
            smbhMass = 1.2 + prng.next_val() * 2.0
        elif g_type == 'L':
            smbhMass = 1.0 + prng.next_val() * 1.5
        else:
            smbhMass = 0.1 + prng.next_val() * 0.4

        g_id = 'HOME_GALAXY' if isHome else f"GALAXY_scX{scx}_scY{scy}"

        return {
            "id": g_id, "cx": scx, "cy": scy, "x": x, "y": y, "type": g_type,
            "radius": radius, "pitchAngle": pitchAngle, "b": b, "numArms": numArms,
            "baseDensity": baseDensity, "rotation": rotation, "smbhMass": smbhMass
        }

    @classmethod
    def getOverlappingGalaxies(cls, minX: float, maxX: float, minY: float, maxY: float, worldSeed: int) -> list:
        p = cls.resolve_params()
        overlapping = []
        minScx = int(math.floor(minX / p["SUPER_CELL_SIZE"])) - 1
        maxScx = int(math.floor(maxX / p["SUPER_CELL_SIZE"])) + 1
        minScy = int(math.floor(minY / p["SUPER_CELL_SIZE"])) - 1
        maxScy = int(math.floor(maxY / p["SUPER_CELL_SIZE"])) + 1

        for scx in range(minScx, maxScx + 1):
            for scy in range(minScy, maxScy + 1):
                galaxy = cls.getGalaxyInSuperCell(scx, scy, worldSeed)
                if galaxy:
                    margin = galaxy["radius"] * 1.5
                    overlapX = (galaxy["x"] + margin >= minX) and (galaxy["x"] - margin <= maxX)
                    overlapY = (galaxy["y"] + margin >= minY) and (galaxy["y"] - margin <= maxY)
                    if overlapX and overlapY:
                        overlapping.append(galaxy)
        return overlapping

    @classmethod
    def getDensityAt(cls, wx: float, wy: float, worldSeed: int) -> float:
        galaxies = cls.getOverlappingGalaxies(wx, wx, wy, wy, worldSeed)
        if not galaxies:
            return 0.0

        totalDensity = 0.0

        for g in galaxies:
            dx = wx - g["x"]
            dy = wy - g["y"]
            r = math.sqrt(dx * dx + dy * dy)

            if r > g["radius"]:
                continue

            theta = math.atan2(dy, dx)
            localD = 0.0
            g_type = g["type"]

            if g_type == 'S':
                rEffCore = g["radius"] * 0.12
                rEffDisk = g["radius"] * 0.35

                if r < rEffCore * 1.5:
                    bulge = g["baseDensity"] * math.exp(-3.671 * (math.pow(r / rEffCore, 0.5) - 1.0))
                    localD = max(localD, bulge)

                phi = theta - math.log(r / rEffCore) / g["b"] - g["rotation"]
                armModulation = math.cos(g["numArms"] * phi)
                disk = g["baseDensity"] * math.exp(-1.672 * (r / rEffDisk - 1.0)) * (0.12 + 0.88 * max(0.0, armModulation))
                localD = max(localD, disk)

            elif g_type == 'SB':
                rBar = g["radius"] * 0.20
                rEffDisk = g["radius"] * 0.35
                rotCos = math.cos(-g["rotation"])
                rotSin = math.sin(-g["rotation"])
                rx = dx * rotCos - dy * rotSin
                ry = dx * rotSin + dy * rotCos

                if r < rBar:
                    barThickness = g["radius"] * 0.045
                    barShapeX = math.exp(-math.pow(rx / rBar, 4.0))
                    barShapeY = math.exp(-math.pow(ry / barThickness, 2.0))
                    localD = g["baseDensity"] * barShapeX * barShapeY * 1.05
                else:
                    phi = theta - math.log(r / rBar) / g["b"] - g["rotation"]
                    armModulation = math.cos(2.0 * phi)
                    disk = g["baseDensity"] * math.exp(-1.672 * ((r - rBar) / rEffDisk)) * (0.12 + 0.88 * max(0.0, armModulation))
                    localD = max(localD, disk)

            elif g_type == 'E':
                rEff = g["radius"] * 0.24
                rotCos = math.cos(-g["rotation"])
                rotSin = math.sin(-g["rotation"])
                rx = dx * rotCos - dy * rotSin
                ry = dx * rotSin + dy * rotCos
                rElliptical = math.sqrt(rx * rx + math.pow(ry / 0.72, 2.0))
                localD = g["baseDensity"] * math.exp(-7.669 * (math.pow(rElliptical / rEff, 0.25) - 1.0))

            elif g_type == 'L':
                rEffCore = g["radius"] * 0.16
                rEffDisk = g["radius"] * 0.32
                core = g["baseDensity"] * math.exp(-1.672 * (r / rEffCore - 1.0))
                disk = g["baseDensity"] * 0.40 * math.exp(-1.672 * (r / rEffDisk - 1.0))
                localD = max(core, disk)

            elif g_type == 'Irr':
                fade = math.exp(-math.pow(r / g["radius"], 2.0))
                n1 = math.sin(wx * 0.00015) * math.cos(wy * 0.00015)
                n2 = math.sin(wx * 0.00045 + wy * 0.00025) * 0.4
                noise = (n1 + n2 + 1.4) / 2.8
                localD = g["baseDensity"] * fade * (0.15 + 0.85 * noise)

            totalDensity = max(totalDensity, localD)

        return min(1.0, totalDensity)

    @classmethod
    def getBubbleAt(cls, wx: float, wy: float, seed: int) -> dict:
        p = cls.resolve_params()
        size = p["SUPERNOVA_BUBBLE_SIZE"]
        bx = int(math.floor(wx / size))
        by = int(math.floor(wy / size))

        cellSeed = int32(math_imul(bx, 12853) ^ math_imul(by, 28351) ^ (seed + 5555))
        prng = Mulberry32(cellSeed)

        if prng.next_val() > p["SUPERNOVA_BUBBLE_CHANCE"]:
            return None

        cx = bx * size + size / 2.0 + (prng.next_val() - 0.5) * 0.45 * size
        cy = by * size + size / 2.0 + (prng.next_val() - 0.5) * 0.45 * size
        r = 8000.0 + prng.next_val() * 12000.0

        d = math.sqrt((wx - cx) ** 2 + (wy - cy) ** 2)
        if d < r:
            return {"x": cx, "y": cy, "r": r}
        return None

    @classmethod
    def getDebrisBeltAt(cls, wx: float, wy: float, seed: int) -> bool:
        val = math.sin(wx * 0.00015 + seed) * math.cos(wy * 0.00015 - seed)
        return val > 0.62

    @classmethod
    def getGravityWellAt(cls, wx: float, wy: float, seed: int) -> dict:
        p = cls.resolve_params()
        size = p["GRAVITY_WELL_SIZE"]
        bx = int(math.floor(wx / size))
        by = int(math.floor(wy / size))

        cellSeed = int32(math_imul(bx, 19349) ^ math_imul(by, 83931) ^ (seed + 9999))
        prng = Mulberry32(cellSeed)

        if prng.next_val() > p["GRAVITY_WELL_CHANCE"]:
            return None

        cx = bx * size + size / 2.0 + (prng.next_val() - 0.5) * 0.45 * size
        cy = by * size + size / 2.0 + (prng.next_val() - 0.5) * 0.45 * size
        r = 5000.0 + prng.next_val() * 7000.0

        d = math.sqrt((wx - cx) ** 2 + (wy - cy) ** 2)
        if d < r:
            return {"x": cx, "y": cy, "r": r}
        return None

    @classmethod
    def getWarpCurrentAt(cls, wx: float, wy: float, seed: int) -> dict:
        angle = math.sin(wx * 0.000025 + seed) * math.cos(wy * 0.000025 - seed) * math.pi * 2.0
        magnitude = abs(math.sin(wx * 0.000015 - wy * 0.000015) * math.cos(wx * 0.000008 + wy * 0.000008))
        return {"angle": angle, "magnitude": min(1.0, max(0.0, magnitude))}

    @classmethod
    def generateSolarSystem(cls, x: int, y: int, starMass: float, worldSeed: int) -> dict:
        p = cls.resolve_params()
        sectorSeed = int32(math_imul(x, 12853) ^ math_imul(y, 28351) ^ worldSeed)
        prng = Mulberry32(sectorSeed)

        planets = []
        asteroidBelts = []

        maxPlanets = p["PLANET_MAX_COUNT"]
        minPlanets = p["PLANET_MIN_COUNT"]
        if starMass > 15.0:
            maxPlanets = 3
            minPlanets = 0
        elif starMass > 6.0:
            maxPlanets = 5
            minPlanets = 1

        planetCount = int(round(minPlanets + prng.next_val() * (maxPlanets - minPlanets)))
        if planetCount == 0:
            return {"planets": planets, "asteroidBelts": asteroidBelts}

        gamma = p["PLANET_TB_SPACING"] + prng.next_val() * 0.25
        props = getStellarProperties(starMass)

        for i in range(1, planetCount + 1):
            tbOffset = p["PLANET_TB_OFFSET"] * math.sqrt(starMass)
            distance = tbOffset * math.pow(gamma, i) + (prng.next_val() - 0.5) * 0.05

            if prng.next_val() < 0.15 and i > 1 and i < planetCount:
                asteroidBelts.append(i)
                continue

            baseTemp = (278.0 * math.pow(props["luminosity"], 0.25)) / math.sqrt(distance)

            p_type = 'Rocky'
            radius = 1.0
            moonsCount = 0
            albedo = p["PLANET_ALBEDO_ROCKY"]

            if baseTemp >= 600.0:
                p_type = 'Vulcanian'
                albedo = p["PLANET_ALBEDO_VULCAN"]
                radius = 0.4 + prng.next_val() * 0.7
                mass = math.pow(radius, 3.0) * (0.85 + prng.next_val() * 0.2)
                moonsCount = 0
            elif baseTemp >= 380.0:
                p_type = 'Rocky'
                albedo = p["PLANET_ALBEDO_ROCKY"]
                radius = 0.5 + prng.next_val() * 0.8
                mass = math.pow(radius, 3.0) * (0.9 + prng.next_val() * 0.2)
                moonsCount = 1 if prng.next_val() < 0.2 else 0
            elif baseTemp >= 245.0:
                p_type = 'Habitable'
                albedo = p["PLANET_ALBEDO_HAB"]
                radius = 0.8 + prng.next_val() * 0.8
                mass = math.pow(radius, 3.0) * (1.0 + prng.next_val() * 0.15)
                moonsCount = int(math.floor(prng.next_val() * 3.0))
            elif baseTemp >= 140.0:
                p_type = 'Desert'
                albedo = p["PLANET_ALBEDO_DESERT"]
                radius = 0.5 + prng.next_val() * 0.6
                mass = math.pow(radius, 3.0) * (0.8 + prng.next_val() * 0.2)
                moonsCount = int(math.floor(prng.next_val() * 3.0))
            elif baseTemp >= 70.0:
                p_type = 'GasGiant'
                albedo = p["PLANET_ALBEDO_GAS"]
                radius = 3.5 + prng.next_val() * 7.5
                mass = math.pow(radius, 2.2) * (0.15 + prng.next_val() * 0.15)
                moonsCount = int(math.floor(4.0 + prng.next_val() * 12.0))
            else:
                p_type = 'IceGiant'
                albedo = p["PLANET_ALBEDO_ICE"]
                radius = 2.8 + prng.next_val() * 4.5
                mass = math.pow(radius, 2.3) * (0.2 + prng.next_val() * 0.1)
                moonsCount = int(math.floor(2.0 + prng.next_val() * 8.0))

            temperature = int(round(baseTemp * math.pow(1.0 - albedo, 0.25)))
            p_id = f"SYS_X{x}_Y{y}-P{i}"

            planets.append({
                "id": p_id,
                "orbitIndex": i,
                "distance": distance,
                "type": p_type,
                "radius": radius,
                "mass": mass,
                "temperature": temperature,
                "moonsCount": moonsCount
            })

        return {"planets": planets, "asteroidBelts": asteroidBelts}

    @classmethod
    def getSectorInCell(cls, cx: int, cy: int, seed: int, densityMultiplier: float) -> dict:
        p = cls.resolve_params()
        cellCenterX = cx * p["CELL_SIZE"] + p["CELL_SIZE"] / 2.0
        cellCenterY = cy * p["CELL_SIZE"] + p["CELL_SIZE"] / 2.0

        baseDensity = cls.getDensityAt(cellCenterX, cellCenterY, seed)
        finalDensity = baseDensity * densityMultiplier

        if finalDensity < 0.04:
            return None

        cellSeed = int32(math_imul(cx, 15485863) ^ math_imul(cy, 32452843) ^ seed)
        prng = Mulberry32(cellSeed)

        if prng.next_val() > finalDensity:
            return None

        ox = prng.next_val()
        oy = prng.next_val()

        rawX = cellCenterX + (ox - 0.5) * 2.0 * p["MAX_JITTER"]
        rawY = cellCenterY + (oy - 0.5) * 2.0 * p["MAX_JITTER"]

        x = int(round(rawX / 100.0) * 100.0)
        y = int(round(rawY / 100.0) * 100.0)

        nearbyGalaxies = cls.getOverlappingGalaxies(x - 250, x + 250, y - 250, y + 250, seed)
        isSMBH = False
        for g in nearbyGalaxies:
            distToG = math.sqrt((x - g["x"]) ** 2 + (y - g["y"]) ** 2)
            if distToG < 400.0 and g["type"] != 'Irr':
                isSMBH = True
                break

        mass = 1.0
        spectralClass = 'G'
        energyDepot = 120000
        matterDepot = 180000
        anomaly = 'None'
        anomalyAngle = None

        if isSMBH:
            mass = 120.0
            spectralClass = 'BlackHole'
            energyDepot = 0
            matterDepot = 2500000
        else:
            classVal = prng.next_val()
            if classVal < p["REMNANT_CHANCE"]:
                mass = 8.0 + prng.next_val() * 15.0
                energyDepot = 0
                if mass < p["REMNANT_PULSAR_LIMIT"]:
                    spectralClass = 'Pulsar'
                    matterDepot = 300000
                else:
                    spectralClass = 'BlackHole'
                    matterDepot = 600000
            else:
                u = prng.next_val()
                massFactor = math.pow(u, p["STELLAR_MASS_IMF"])
                mass = p["MIN_STELLAR_MASS"] * math.exp(math.log(p["MAX_STELLAR_MASS"] / p["MIN_STELLAR_MASS"]) * massFactor)

                props = getStellarProperties(mass)
                spectralClass = getSpectralClassFromTemp(props["temperature"])
                energyDepot = int(round(props["luminosity"] * 120000.0))
                matterDepot = int(round(math.pow(1.0 / mass, 0.45) * 180000.0))

        occurrence = 'Normal'
        activeBubble = cls.getBubbleAt(x, y, seed)
        if activeBubble:
            occurrence = 'SupernovaBubble'
            matterDepot = int(round(matterDepot * 0.25))
            energyDepot = int(round(energyDepot * 0.50))
        else:
            inDustLane = False
            for g in nearbyGalaxies:
                if g["type"] == 'S' or g["type"] == 'SB':
                    rx = x - g["x"]
                    ry = y - g["y"]
                    gr = math.sqrt(rx * rx + ry * ry)
                    rEffCore = g["radius"] * 0.12

                    if rEffCore < gr < g["radius"]:
                        gTheta = math.atan2(ry, rx)
                        phi = gTheta - math.log(gr / rEffCore) / g["b"] - g["rotation"]
                        if math.sin(g["numArms"] * phi - 0.52) > 0.82:
                            inDustLane = True
                            break

            if inDustLane:
                occurrence = 'DustLane'
                matterDepot = int(round(matterDepot * 2.20))
                energyDepot = int(round(energyDepot * 0.40))
            else:
                nurseryNoise = math.sin(x * 0.0005) * math.cos(y * 0.0005)
                baseDensity = cls.getDensityAt(x, y, seed)
                if baseDensity > 0.08 and nurseryNoise > 0.58:
                    occurrence = 'StellarNursery'
                    energyDepot = int(round(energyDepot * 1.35))
                    matterDepot = int(round(matterDepot * 1.25))

        if spectralClass == 'Pulsar':
            anomalyAngle = prng.next_val() * math.pi * 2.0

        activeWell = cls.getGravityWellAt(x, y, seed)
        if activeWell:
            anomaly = 'GravityWell'
            mass = mass * 2.0
            matterDepot = int(round(matterDepot * p["GRAVITY_WELL_MULT"]))

        debrisBelt = cls.getDebrisBeltAt(x, y, seed)
        if debrisBelt and spectralClass != 'BlackHole' and spectralClass != 'Pulsar':
            matterDepot = int(round(matterDepot * 2.50))

        system_details = cls.generateSolarSystem(x, y, mass, seed)
        warpCurrent = cls.getWarpCurrentAt(x, y, seed)

        s_id = f"SYS_X{x}_Y{y}"

        return {
            "id": s_id, "x": x, "y": y, "mass": mass, "spectralClass": spectralClass,
            "occurrence": occurrence, "anomaly": anomaly, "anomalyAngle": anomalyAngle,
            "debrisBelt": debrisBelt, "energyDepot": energyDepot, "matterDepot": matterDepot,
            "system": system_details, "warpCurrent": warpCurrent
        }

    @classmethod
    def getStartingSystem(cls, seedStr: str, densityMultiplier: float) -> dict:
        p = cls.resolve_params()
        seed = hash_string_to_int(seedStr)
        homeGalaxy = cls.getGalaxyInSuperCell(0, 0, seed)

        if not homeGalaxy:
            return {
                "id": "SYS_X0_Y0", "x": 0, "y": 0, "mass": 1.0, "spectralClass": "G",
                "occurrence": "Normal", "anomaly": "None", "debrisBelt": False,
                "energyDepot": 120000, "matterDepot": 180000
            }

        centerCx = int(math.floor(homeGalaxy["x"] / p["CELL_SIZE"]))
        centerCy = int(math.floor(homeGalaxy["y"] / p["CELL_SIZE"]))
        candidates = []

        for r in range(1, 21):
            for dx in range(-r, r + 1):
                for dy in range(-r, r + 1):
                    if abs(dx) != r and abs(dy) != r:
                        continue

                    cx = centerCx + dx
                    cy = centerCy + dy
                    s = cls.getSectorInCell(cx, cy, seed, densityMultiplier)
                    if s and s["spectralClass"] != 'BlackHole':
                        candidates.append(s)

            if len(candidates) >= 8:
                break

        if candidates:
            prng = Mulberry32(seed + 999)
            idx = int(math.floor(prng.next_val() * len(candidates)))
            selected = candidates[idx]
            # Force starting node to balanced properties
            return {
                **selected,
                "mass": 1.0,
                "spectralClass": "G",
                "occurrence": "Normal",
                "anomaly": "None",
                "debrisBelt": False,
                "energyDepot": 120000,
                "matterDepot": 180000
            }

        fallbackX = int(round(homeGalaxy["x"] / 100.0) * 100.0)
        fallbackY = int(round(homeGalaxy["y"] / 100.0) * 100.0)
        return {
            "id": f"SYS_X{fallbackX}_Y{fallbackY}",
            "x": fallbackX, "y": fallbackY, "mass": 1.0, "spectralClass": "G",
            "occurrence": "Normal", "anomaly": "None", "debrisBelt": False,
            "energyDepot": 120000, "matterDepot": 180000
        }

    @classmethod
    def getSectorsInArea(cls, minX: float, maxX: float, minY: float, maxY: float, seedStr: str, densityMultiplier: float) -> list:
        p = cls.resolve_params()
        seed = hash_string_to_int(seedStr)
        sectors = []

        minCx = int(math.floor(minX / p["CELL_SIZE"])) - 1
        maxCx = int(math.floor(maxX / p["CELL_SIZE"])) + 1
        minScy = int(math.floor(minY / p["CELL_SIZE"])) - 1
        maxScy = int(math.floor(maxY / p["CELL_SIZE"])) + 1

        for cx in range(minCx, maxCx + 1):
            for cy in range(minScy, maxScy + 1):
                sector = cls.getSectorInCell(cx, cy, seed, densityMultiplier)
                if sector:
                    if minX <= sector["x"] <= maxX and minY <= sector["y"] <= maxY:
                        sectors.append(sector)

        return sectors
