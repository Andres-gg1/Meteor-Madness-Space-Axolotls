# Meteor Impact Calculations

## Impact and Crater Calculation

This module provides computational tools to simulate and analyze the physical consequences of an **asteroid impact with Earth**, including crater formation, ejected mass, and velocity distributions.\
It is designed to complement the trajectory and orbital data obtained from NASA APIs, focusing on **post-impact dynamics**.

***

**General Description**

The `ImpactCalculations` class implements empirical and physical equations derived from planetary impact studies.\
It models the formation of craters, excavation of material, and distribution of ejected debris.

All functions are static, meaning they can be called without creating an instance of the class.

***

#### 1. Constants and Parameters

| Constant                 | Description                                    | Default Value / Units                          |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| `K1`                     | Empirical scaling constant for crater diameter | `1`                                            |
| `u`                      | Density scaling exponent                       | `0.55`                                         |
| `v`                      | π-group scaling exponent                       | `0.17`                                         |
| `b`                      | Ejection mass distribution exponent            | `2.5`                                          |
| `c`                      | Ejection velocity coefficient                  | `0.5`                                          |
| `gravity`                | Gravitational acceleration                     | `9.81 m/s²`                                    |
| `gravitational_constant` | Universal constant ( G )                       | ( 6.674 \times 10^{-11} , \mathrm{Nm^2/kg^2} ) |
| `earth_mass`             | Mass of Earth                                  | ( 5.972 \times 10^{24} , \mathrm{kg} )         |
| `earth_radio`            | Radius of Earth                                | ( 6.371 \times 10^{6} , \mathrm{m} )           |
| `escape_velocity`        | Escape velocity from Earth                     | `11186 m/s`                                    |

***

#### 2. Calculation Functions

**2.1 `calculateGroupPI(diameter, velocity)`**

Computes the **dimensionless π-group** parameter used in crater scaling laws.

```
def calculateGroupPI(diameter, velocity): 
        # Group Pi is a variable without units that is needed to calculate the diameter of the impact crater
        return (ImpactCalculations.gravity * diameter) / math.pow(velocity, 2)
```

***

**2.2 `calculateInitialCraterDiameter(asteroid_diameter, asteroid_density, asteroid_velocity, ground_density)`**

Computes the **initial crater diameter** right after the impact, before collapse.

<pre><code><strong>def calculateInitialCraterDiameter(asteroid_diameter, asteroid_density, asteroid_velocity, ground_density): 
</strong><strong>        # This function calculates the initial diameter that the crater has right after the asteroid crashes into the earth
</strong><strong>        return (ImpactCalculations.K1 
</strong><strong>                * math.pow((asteroid_density/ground_density), ImpactCalculations.u) 
</strong><strong>                * math.pow(ImpactCalculations.calculateGroupPI(asteroid_diameter, asteroid_velocity),
</strong><strong>                            - ImpactCalculations.v)
</strong><strong>                * asteroid_diameter)[ D_c = K_1 \left( \frac{\rho_a}{\rho_s} \right)^{\mu} \pi_2^{-v} D_a ]
</strong></code></pre>

***

**2.3 `calculateFinalCraterDiameter(initial_diameter)`**

Estimates the **final crater diameter** after the transient crater stabilizes.

```
def calculateFinalCraterDiameter(initial_diameter): 
        # This function calculates the diameter that the crater ends up with after the earth shifts into a stable shape
        return initial_diameter * 1.25
```

***

**2.4 `calculateExcavatedMass(initial_diameter, ground_density)`**

Calculates the **mass of ground material ejected** by the impact.

```
def calculateExcavatedMass(initial_diameter, ground_density): 
        # This function calculates the mass of the dirt that got expelled from the ground after the impact
        return (math.pi / 24) * math.pow(initial_diameter, 3) * ground_density * 1000
```

***

**2.5 `calculateMinimalEjectionVelocity(initial_diameter)`**

Computes the **minimum velocity** of ejected material near the crater rim.

```
    def calculateMinimalEjectionVelocity(initial_diameter): 
        # This function calculates the minimal velocity that the expelled dirt reaches after the impact of the asteroid
        return math.sqrt(ImpactCalculations.gravity * (initial_diameter / 2))
```

***

**2.6 `calculateMaximumEjectionVelocity(asteroid_velocity)`**

Computes the **maximum velocity** achieved by the fastest ejected fragments.

```
    def calculateMaximumEjectionVelocity(asteroid_velocity): 
        # This function calculates the peak of the velocity that the expelled dirt reaches after impact
        return asteroid_velocity * ImpactCalculations.c
```

***

**2.7 `calculateStratosphereVelocity(latitude)`**

Determines the **velocity required** for ejected material to reach the stratosphere,\
considering that its height varies with latitude.

```
    def calculateStratosphereVelocity(latitude):
        # This function calculates the velocity that an object needs to reach the stratosphere, since the height of the stratosphere changes depending on the latitude
        return math.sqrt(4 
                         * ImpactCalculations.gravity 
                         * numpy.interp(abs(latitude), [0, 90], [20000, 7000]))
```

Where ( h\_s(\phi) ) varies linearly from **20 km at the equator** to **7 km at the poles**.

***

**2.8 `calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, target_velocity)`**

Estimates the **fraction of ejected mass** that reaches or exceeds a given velocity.

```
    def calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, target_velocity):
        # This function calculates the percentage of dirt that was expelled from the ground to reach a target velocity
        return math.pow((minimal_ejection_velocity / target_velocity), ImpactCalculations.b)
```

***

**2.9 `calculateMassToReachStratosphere(latitude, minimal_ejection_velocity, excavated_mass)`**

Computes the **mass of material** reaching the stratosphere.

```
    def calculateMassToReachStratosphere(latitude, minimal_ejection_velocity, excavated_mass):
        # This function calculates the mass of the expelled dirt that reaches the stratosphere
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, ImpactCalculations.calculateStratosphereVelocity(latitude))
```

***

**2.10 `calculateMassToEscapeGravity(minimal_ejection_velocity, excavated_mass)`**

Estimates the **mass that escapes Earth's gravity**.

```
    def calculateMassToEscapeGravity(minimal_ejection_velocity, excavated_mass):
        # This function calculates the mass of the expelled dirt that escapes the earth's gravity
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, ImpactCalculations.escape_velocity)
```

***

**2.11 `calculateGravityAccelerationByHeight(height)`**

Calculates the **gravitational acceleration** at a specific height above Earth.

```
    def calculateGravityAccelerationByHeight(height):
        # Calculates the acceleration of the gravity depending on the height of the object
        return (ImpactCalculations.gravitational_constant * ImpactCalculations.earth_mass) / math.pow((ImpactCalculations.earth_radio + height), 2)
```

***

**2.12 `calculateVelocityOnEntranceToAtmosphere(initial_velocity, initial_height)`**

Computes the **velocity of an asteroid** as it enters the atmosphere,\
accounting for gravitational acceleration between its initial position and 100 km altitude.

```
    def calculateVelocityOnEntranceToAtmosphere(initial_velocity, initial_height):
        # Calculates the final velocity of the asteroid up until it reaches the atmosphere
        return math.sqrt(math.pow(initial_velocity, 2) 
                         + (2 
                            * ImpactCalculations.gravitational_constant 
                            * ImpactCalculations.earth_mass 
                            * ((1 / (ImpactCalculations.earth_radio + initial_height)) 
                               - (1 / (ImpactCalculations.earth_radio + 100000)))))
```

***

#### 3. Example Usage

```python
from impact_calculations import ImpactCalculations

# Example parameters
asteroid_diameter = 50  # meters
asteroid_density = 3000  # kg/m³
asteroid_velocity = 20000  # m/s
ground_density = 2500  # kg/m³
latitude = 30  # degrees

pi_group = ImpactCalculations.calculateGroupPI(asteroid_diameter, asteroid_velocity)
initial_crater = ImpactCalculations.calculateInitialCraterDiameter(
    asteroid_diameter, asteroid_density, asteroid_velocity, ground_density
)
final_crater = ImpactCalculations.calculateFinalCraterDiameter(initial_crater)
excavated_mass = ImpactCalculations.calculateExcavatedMass(initial_crater, ground_density)
v_min = ImpactCalculations.calculateMinimalEjectionVelocity(initial_crater)
mass_strato = ImpactCalculations.calculateMassToReachStratosphere(latitude, v_min, excavated_mass)
mass_escape = ImpactCalculations.calculateMassToEscapeGravity(v_min, excavated_mass)

print(f"Initial crater diameter: {initial_crater:.2f} m")
print(f"Final crater diameter: {final_crater:.2f} m")
print(f"Excavated mass: {excavated_mass:.2e} kg")
print(f"Mass reaching stratosphere: {mass_strato:.2e} kg")
print(f"Mass escaping gravity: {mass_escape:.2e} kg")
```
