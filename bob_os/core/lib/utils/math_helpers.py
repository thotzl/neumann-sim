import math

def calc_distance(x1, y1, x2, y2):
    """
    Berechnet die euklidische Distanz zwischen zwei 2D-Koordinaten.
    """
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

def is_within_bounds(x, y, x_min=-5000, x_max=5000, y_min=-5000, y_max=5000):
    """
    Prüft, ob sich eine Koordinate innerhalb des spielbaren Sektorbereichs befindet.
    """
    return x_min <= x <= x_max and y_min <= y <= y_max
