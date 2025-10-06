import numpy as np

# 1. ISA physical constants
P0 = 1013.25    # Standard sea level pressure (hPa)
T0 = 288.15     # Standard sea level temperature (K)
L = 0.0065      # Temperature lapse rate (K/m)
g = 9.81        # Gravity acceleration (m/s^2)
M = 0.0289644   # Molar mass of dry air (kg/mol)
R = 8.31447     # Universal gas constant (J/mol*K)

def calculate_air_volume(diameter, distance):
    cross_sectional_area = np.pi * (diameter/2)**2
    volume = cross_sectional_area * distance
    return volume

def calculate_air_mass(diameter, distance, density=1.007):
    volume = calculate_air_volume(diameter, distance)
    mass = volume * density * 1000
    return mass

def calculate_pressure_hpa(altitude_meters):
    # Definition of atmospheric layers - [base_altitude, base_temp, lapse_rate, base_pressure]
    layers = [
        [0,      288.15,   -0.0065,  1013.25],  # Troposphere
        [11000,  216.65,    0.0,     226.321],  # Stratosphere 1
        [20000,  216.65,    0.001,   54.7489],  # Stratosphere 2
        [32000,  228.65,    0.0028,  8.68019],  # Stratosphere 3
        [47000,  270.65,    0.0,     1.10906],  # Stratopause
        [51000,  270.65,   -0.0028,  0.66938],  # Mesosphere 1
        [71000,  214.65,   -0.002,   0.03956],  # Mesosphere 2
        [84852,  186.95,    0.0,     0.00373],  # Mesopause
    ]
    
    # Handle special cases
    if altitude_meters < 0:
        # For altitudes below sea level, use a linear approximation
        return P0 + 0.12 * abs(altitude_meters)  # Simple approximation
    
    # Find the correct atmospheric layer
    layer = None
    for i, layer_data in enumerate(layers):
        if i == len(layers) - 1 or altitude_meters < layers[i+1][0]:
            layer = layer_data
            break
    
    # Extract layer data
    h_b = layer[0]      # Base altitude of the layer (m)
    T_b = layer[1]      # Base temperature of the layer (K)
    lapse = layer[2]    # Temperature lapse rate (K/m)
    P_b = layer[3]      # Base pressure of the layer (hPa)
    
    # Calculate temperature at the given altitude
    T_h = T_b + lapse * (altitude_meters - h_b)
    
    if abs(lapse) < 1e-10:
        P_h = P_b * np.exp(-g * M * (altitude_meters - h_b) / (R * T_b))
    else:
        P_h = P_b * (T_h / T_b) ** (-g * M / (R * lapse))
    
    if altitude_meters > 100000:
        scale_height = 7000
        P_h = 0.00373 * np.exp(-((altitude_meters - 84852) / scale_height))
    
    return max(P_h, 1e-6)

def calculate_air_density(altitude_meters, temperature_offset=0, humidity=0):
    """
    Calculate air density at given altitude.
    
    Returns: Air density in kg/m³
    """
    P_hpa = calculate_pressure_hpa(altitude_meters)
    P_pa = P_hpa * 100
    
    layers = [
        [0,      288.15,   -0.0065],
        [11000,  216.65,    0.0],
        [20000,  216.65,    0.001],
        [32000,  228.65,    0.0028],
        [47000,  270.65,    0.0],
        [51000,  270.65,   -0.0028],
        [71000,  214.65,   -0.002],
        [84852,  186.95,    0.0],
    ]
    
    layer = None
    for i, layer_data in enumerate(layers):
        if i == len(layers) - 1 or altitude_meters < layers[i+1][0]:
            layer = layer_data
            break
    
    h_b = layer[0]
    T_b = layer[1]
    lapse = layer[2]
    
    T_h = T_b + lapse * (altitude_meters - h_b)
    T_actual = T_h + temperature_offset
    
    humidity_factor = 1.0 - 0.06 * humidity
    
    R_specific = R / M
    rho = (P_pa / (R_specific * T_actual)) * humidity_factor
    
    if altitude_meters > 150000:
        return 1e-10
    
    return max(rho, 1e-10)