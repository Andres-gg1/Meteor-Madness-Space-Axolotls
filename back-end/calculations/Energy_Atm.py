import numpy as np
from calculations.Air_Calculations import calculate_air_density

# Physical constants
g = 9.81  # m/s², gravity
rho_rock = 3000  # kg/m³, typical rock density
Cd = 1.0  # Drag coefficient

def simulate_meteor_atmospheric_entry(diameter_m, velocity_m_s, entry_angle_deg):
    """
    Simulates the atmospheric entry of a rocky meteor and calculates its final energy.

    Parameters:
        diameter_m: Diameter of the meteor (m)
        velocity_m_s: Initial velocity (m/s)
        entry_angle_deg: Entry angle from horizontal (degrees)

    Returns:
        Ef: Final kinetic energy (J)
        v: Final velocity at ground (m/s)
        mass: Meteor mass (kg)
        E_drag: Energy lost due to atmospheric drag (J)
        percent_lost: Percentage of initial kinetic energy lost
    """
    step_m = 100
    initial_altitude_m = 100_000
    theta = np.radians(entry_angle_deg)
    radius = diameter_m / 2
    A = np.pi * radius**2
    volume = 4/3 * np.pi * radius**3
    mass = rho_rock * volume

    v = velocity_m_s
    h = initial_altitude_m

    # --- integrate descent ---
    while h > 0:
        rho_air = calculate_air_density(h)
        Fd = 0.5 * rho_air * Cd * A * v**2
        delta_s = step_m / np.sin(theta)  # Path length along trajectory
        v = np.sqrt(max(v**2 + 2 * g * np.sin(theta) * delta_s - 2 * Fd * delta_s / mass, 0))
        h -= step_m

    # --- energies ---
    Ek_initial = 0.5 * mass * velocity_m_s**2
    Ek_final = 0.5 * mass * v**2
    Ef = Ek_final
    E_drag = Ek_initial - Ek_final   # ensures consistency
    percent_lost = 100 * E_drag / Ek_initial

    return Ef, v, mass, E_drag, percent_lost

# Example cases by diameter range
diameter_cases = [(100, 500), (500, 1000), (1000, 5000), (5000, 10000)]
velocity_example = 20000  # m/s, typical meteor speed
entry_angle_deg = 45

if __name__ == "__main__":
    for d_min, d_max in diameter_cases:
        d = (d_min + d_max) / 2
        Ef, v_final, mass, E_drag, percent_lost = simulate_meteor_atmospheric_entry(d, velocity_example, entry_angle_deg)
        print(f"Diameter: {d:.0f} m | Mass: {mass:.2e} kg | Final velocity: {v_final:.1f} m/s | "
            f"Ef: {Ef:.2e} J | Energy lost: {E_drag:.2e} J ({percent_lost:.2f}%)")
