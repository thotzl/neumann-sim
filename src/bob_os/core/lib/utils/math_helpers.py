import math

def calc_distance(x1, y1, x2, y2):
    """
    Calculates the Euclidean distance between two 2D coordinates.
    """
    return math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

def is_within_bounds(x, y, x_min=-5000, x_max=5000, y_min=-5000, y_max=5000):
    """
    Checks if a coordinate is within the playable sector area.
    """
    return x_min <= x <= x_max and y_min <= y <= y_max
