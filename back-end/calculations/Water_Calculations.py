import math

# Physical constants
g = 9.81          # gravity (m/s²)
rho_water = 1000  # water density (kg/m³)
eta = 0.15        # energy transfer efficiency to water (0.1-0.2)

def asteroid_water_impact(D, rho_asteroid, E_k, velocity):
    """
    Calculate asteroid water impact effects.
    
    Args:
        D: Asteroid diameter (m)
        rho_asteroid: Asteroid density (kg/m³) - MUST BE IN kg/m³
        E_k: Kinetic energy (Joules)
        velocity: Impact velocity (m/s)
    
    Returns:
        dict: Impact results with max_depth, cavity_radius, tsunami_height
    """
    area = math.pi * (D/2)**2

    # Maximum depth under water
    # Simplified formula: Potential Energy = Kinetic Energy
    max_depth = E_k / (rho_water * g * area)

    # Cavity radius (semi-empirical, scales with D^0.8 and v^0.5)
    # k adjusted from Crawford & Mader data: 500 m → 5000 m, 1000 m → 10000 m
    k = 10
    alpha = 0.8
    beta = 0.5
    cavity_radius = k * D**alpha * (rho_asteroid/rho_water)**(1/3) * velocity**beta / (20000**beta)

    # Initial tsunami height (very simplified estimate)
    tsunami_height = eta * E_k / (rho_water * g * cavity_radius**3)

    return {
        "max_depth": max_depth,
        "cavity_radius": cavity_radius,
        "tsunami_height": tsunami_height
    }

def convert_density_to_kg_m3(density_g_cm3):
    """
    Convert density from g/cm³ to kg/m³
    
    Args:
        density_g_cm3: Density in g/cm³
    
    Returns:
        Density in kg/m³
    """
    return density_g_cm3 * 1000

# Integration function for NASA API data
def asteroid_water_impact_from_api_data(diameter_m, density_g_cm3, velocity_m_s):
    """
    Calculate water impact using NASA API data format.
    
    Args:
        diameter_m: Asteroid diameter in meters
        density_g_cm3: Density from NASA API (g/cm³)
        velocity_m_s: Impact velocity (m/s)
    
    Returns:
        dict: Impact results
    """
    # CRITICAL: Convert density from g/cm³ to kg/m³
    rho_asteroid_kg_m3 = convert_density_to_kg_m3(density_g_cm3)
    
    # Calculate mass and kinetic energy
    V_asteroid = (4/3) * math.pi * (diameter_m/2)**3
    M_asteroid = rho_asteroid_kg_m3 * V_asteroid
    E_k = 0.5 * M_asteroid * velocity_m_s**2
    
    # Run impact calculation
    return asteroid_water_impact(
        D=diameter_m,
        rho_asteroid=rho_asteroid_kg_m3,
        E_k=E_k,
        velocity=velocity_m_s
    )

if __name__ == '__main__':
    print("="*60)
    print("EXAMPLE 1: Direct calculation with kg/m³")
    print("="*60)
    
    # Hypothetical Asteroid Parameters
    D_asteroid = 50.0       # Diameter (m)
    rho_rock = 3000.0       # Asteroid density (kg/m³) - typical rock
    v_impact = 20000.0      # Impact velocity (m/s) - 20 km/s

    # Calculate Mass and Kinetic Energy (E_k)
    V_asteroid = (4/3) * math.pi * (D_asteroid/2)**3
    M_asteroid = rho_rock * V_asteroid
    E_k_impact = 0.5 * M_asteroid * v_impact**2

    print(f"\n--- Asteroid Impact Parameters ---")
    print(f"Diameter (D): {D_asteroid} m")
    print(f"Density (rho_asteroid): {rho_rock} kg/m³")
    print(f"Velocity (v): {v_impact} m/s")
    print(f"Mass (M): {M_asteroid:.2e} kg")
    print(f"Calculated Kinetic Energy (E_k): {E_k_impact:.2e} Joules")

    # Run the simulation function
    results = asteroid_water_impact(
        D=D_asteroid,
        rho_asteroid=rho_rock,
        E_k=E_k_impact,
        velocity=v_impact
    )

    print("\n--- Impact Results ---")
    print(f"Maximum Penetration Depth: {results['max_depth']:.2f} meters")
    print(f"Transient Cavity Radius: {results['cavity_radius']:.2f} meters")
    print(f"Initial Tsunami Height: {results['tsunami_height']:.2f} meters")

    print("\n" + "="*60)
    print("EXAMPLE 2: Using NASA API format (g/cm³)")
    print("="*60)
    
    # NASA API typically returns density in g/cm³
    diameter_nasa = 50.0      # meters
    density_nasa = 3.0        # g/cm³ (NASA API format)
    velocity_nasa = 20000.0   # m/s
    
    print(f"\n--- NASA API Input ---")
    print(f"Diameter: {diameter_nasa} m")
    print(f"Density: {density_nasa} g/cm³")
    print(f"Velocity: {velocity_nasa} m/s")
    
    # Convert and calculate
    results_nasa = asteroid_water_impact_from_api_data(
        diameter_m=diameter_nasa,
        density_g_cm3=density_nasa,
        velocity_m_s=velocity_nasa
    )
    
    print(f"\n--- Converted Density ---")
    print(f"Density: {convert_density_to_kg_m3(density_nasa)} kg/m³")
    
    print("\n--- Impact Results ---")
    print(f"Maximum Penetration Depth: {results_nasa['max_depth']:.2f} meters")
    print(f"Transient Cavity Radius: {results_nasa['cavity_radius']:.2f} meters")
    print(f"Initial Tsunami Height: {results_nasa['tsunami_height']:.2f} meters")