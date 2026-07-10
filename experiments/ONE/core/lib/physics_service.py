import math

def calc_distance(x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    return math.sqrt(dx*dx + dy*dy)

def calc_travel_cost(dist, cost_factor):
    return int(dist * cost_factor)

def calc_eta(dist, speed):
    return max(1, math.ceil(dist / speed))

def linear_interpolate(start, end, progress):
    return start + (end - start) * progress

def calculate_scan_coordinates(origin_x, origin_y, distance, angle_degrees, grid_size=100):
    """
    Berechnet die Zielkoordinaten eines Scans und snappt sie auf das planetare Grid.
    """
    raw_x = origin_x + distance * math.cos(math.radians(angle_degrees))
    raw_y = origin_y + distance * math.sin(math.radians(angle_degrees))
    
    snap_x = int(round(raw_x / float(grid_size)) * grid_size)
    snap_y = int(round(raw_y / float(grid_size)) * grid_size)
    
    return snap_x, snap_y

def calculate_upgrade_cost(base_cost, upgrade_multiplier):
    """
    Berechnet die absoluten Materie-Kosten für ein Infrastruktur-Upgrade.
    """
    return int(base_cost * upgrade_multiplier)
