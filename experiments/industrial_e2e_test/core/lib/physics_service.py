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
