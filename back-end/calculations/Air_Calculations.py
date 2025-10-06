import numpy as np

# Constants
g = 9.81         # m/s²
R = 8.31447      # J/(mol*K)
M = 0.0289644    # kg/mol

# Layers up to 100 km: [base_altitude_m, base_temp_K, lapse_rate_K_per_m, base_pressure_hPa]
layers = [
    [0, 288.15, -0.0065, 1013.25],
    [11000, 216.65, 0.0, 226.321],
    [20000, 216.65, 0.001, 54.7489],
    [32000, 228.65, 0.0028, 8.68019],
    [47000, 270.65, 0.0, 1.10906],
    [51000, 270.65, -0.0028, 0.66938],
    [71000, 214.65, -0.002, 0.03956],
    [84852, 186.95, 0.0, 0.00373],
]

def pressure_hpa(altitude_m):
    if altitude_m < 0:
        return 1013.25 + 0.12 * abs(altitude_m)
    for i, layer in enumerate(layers):
        if i == len(layers) - 1 or altitude_m < layers[i+1][0]:
            h_b, T_b, lapse, P_b = layer
            break
    T_h = T_b + lapse * (altitude_m - h_b)
    if abs(lapse) < 1e-10:
        P_h = P_b * np.exp(-g * M * (altitude_m - h_b) / (R * T_b))
    else:
        P_h = P_b * (T_h / T_b) ** (-g * M / (R * lapse))
    return P_h

def air_density(altitude_m):
    P_hpa = pressure_hpa(altitude_m)
    P_pa = P_hpa * 100
    for i, layer in enumerate(layers):
        if i == len(layers) - 1 or altitude_m < layers[i+1][0]:
            h_b, T_b, lapse, _ = layer
            break
    T_h = T_b + lapse * (altitude_m - h_b)
    R_specific = R / M
    rho = P_pa / (R_specific * T_h)
    return max(rho, 1e-10)
