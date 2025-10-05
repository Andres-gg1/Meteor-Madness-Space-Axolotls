import math

# Physical constants
g = 9.81          # gravity (m/s²)
rho_water = 1000  # water density (kg/m³)
eta = 0.15        # energy transfer efficiency to water (0.1-0.2)

def asteroid_water_impact(D, rho_asteroid, E_k, velocity):
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

if __name__ == '__main__':
    # EXAMPLE USAGE
    # Hypothetical Asteroid Parameters
    D_asteroid = 50.0       # Diameter (m)
    rho_rock = 3000.0       # Asteroid density (kg/m³) - typical rock
    v_impact = 20000.0      # Impact velocity (m/s) - 20 km/s

    # Calculate Mass and Kinetic Energy (E_k)
    V_asteroid = (4/3) * math.pi * (D_asteroid/2)**3
    M_asteroid = rho_rock * V_asteroid
    E_k_impact = 0.5 * M_asteroid * v_impact**2

    print(f"--- Asteroid Impact Parameters ---")
    print(f"Diameter (D): {D_asteroid} m")
    print(f"Density (rho_asteroid): {rho_rock} kg/m³")
    print(f"Velocity (v): {v_impact} m/s")
    print(f"Calculated Kinetic Energy (E_k): {E_k_impact:.2e} Joules")

    # Run the simulation function
    results = asteroid_water_impact(
        D=D_asteroid,
        rho_asteroid=rho_rock,
        E_k=E_k_impact,
        velocity=v_impact
    )

    print("\n--- Impact Results ---")
    print(f"Maximum Penetration Depth (max_depth): {results['max_depth']:.2f} meters")
    print(f"Transient Cavity Radius (cavity_radius): {results['cavity_radius']:.2f} meters")
    print(f"Initial Tsunami Height (tsunami_height): {results['tsunami_height']:.2f} meters")