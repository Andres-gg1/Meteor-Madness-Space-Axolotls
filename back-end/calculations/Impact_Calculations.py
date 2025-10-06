import math
import numpy

class ImpactCalculations:
    """
    ALL DENSITIES MUST BE IN kg/m³ for these calculations
    Convert from g/cm³ using: density_kg_m3 = density_g_cm3 * 1000
    """
    
    # Earth impact constants
    K1 = 1
    u = 0.55
    v = 0.17
    b = 2.5  # value between 2 and 3, 2.5 for an average result
    c = 0.5
    gravity = 9.81  # m/s²
    gravitational_constant = 6.674 * math.pow(10, -11)  # Nm²/kg²
    earth_mass = 5.972 * math.pow(10, 24)  # kg
    earth_radio = 6.371 * math.pow(10, 6)  # m
    escape_velocity = 11186  # m/s

    @staticmethod
    def calculateGroupPI(diameter, velocity): 
        """
        Group Pi is a dimensionless variable needed to calculate crater diameter
        
        Args:
            diameter: meters
            velocity: m/s
        """
        # Prevent division by zero - minimum velocity for meaningful impact
        min_velocity = 1.0  # m/s - below this, no significant crater forms
        effective_velocity = max(velocity, min_velocity)
        return (ImpactCalculations.gravity * diameter) / math.pow(effective_velocity, 2)

    @staticmethod
    def calculateInitialCraterDiameter(asteroid_diameter, asteroid_density_kg_m3, asteroid_velocity, ground_density_kg_m3): 
        """
        Calculate initial crater diameter right after impact
        
        Args:
            asteroid_diameter: meters
            asteroid_density_kg_m3: MUST BE IN kg/m³
            asteroid_velocity: m/s
            ground_density_kg_m3: MUST BE IN kg/m³
        """
        return (ImpactCalculations.K1 
                * math.pow((asteroid_density_kg_m3 / ground_density_kg_m3), ImpactCalculations.u) 
                * math.pow(ImpactCalculations.calculateGroupPI(asteroid_diameter, asteroid_velocity),
                            - ImpactCalculations.v)
                * asteroid_diameter)
    
    @staticmethod
    def calculateFinalCraterDiameter(initial_diameter): 
        """Calculate final stable crater diameter"""
        return initial_diameter * 1.25
    
    @staticmethod
    def calculateExcavatedMass(initial_diameter, ground_density_kg_m3): 
        """
        Calculate mass of expelled dirt
        
        Args:
            initial_diameter: meters
            ground_density_kg_m3: MUST BE IN kg/m³
        
        Returns:
            Mass in kg
        """
        return (math.pi / 24) * math.pow(initial_diameter, 3) * ground_density_kg_m3

    @staticmethod
    def calculateMinimalEjectionVelocity(initial_diameter): 
        """Calculate minimal velocity of expelled dirt (m/s)"""
        return math.sqrt(ImpactCalculations.gravity * (initial_diameter / 2))

    @staticmethod
    def calculateMaximumEjectionVelocity(asteroid_velocity): 
        """Calculate peak velocity of expelled dirt (m/s)"""
        return asteroid_velocity * ImpactCalculations.c
    
    @staticmethod
    def calculateStratosphereVelocity(latitude):
        """Calculate velocity needed to reach stratosphere (m/s)"""
        return math.sqrt(4 
                         * ImpactCalculations.gravity 
                         * numpy.interp(abs(latitude), [0, 90], [20000, 7000]))
    
    @staticmethod
    def calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, target_velocity):
        """Calculate percentage of dirt reaching target velocity"""
        return math.pow((minimal_ejection_velocity / target_velocity), ImpactCalculations.b)
    
    @staticmethod
    def calculateMassToReachStratosphere(latitude, minimal_ejection_velocity, excavated_mass):
        """Calculate mass reaching stratosphere (kg)"""
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(
            minimal_ejection_velocity, 
            ImpactCalculations.calculateStratosphereVelocity(latitude)
        )
    
    @staticmethod
    def calculateMassToEscapeGravity(minimal_ejection_velocity, excavated_mass):
        """Calculate mass escaping Earth's gravity (kg)"""
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(
            minimal_ejection_velocity, 
            ImpactCalculations.escape_velocity
        )
    
    @staticmethod
    def calculateGravityAccelerationByHeight(height):
        """Calculate gravity acceleration at given height (m/s²)"""
        return (ImpactCalculations.gravitational_constant * ImpactCalculations.earth_mass) / math.pow((ImpactCalculations.earth_radio + height), 2)
    
    @staticmethod
    def calculateVelocityOnEntranceToAtmosphere(initial_velocity, initial_height):
        """Calculate velocity when reaching atmosphere (m/s)"""
        return math.sqrt(math.pow(initial_velocity, 2) 
                         + (2 
                            * ImpactCalculations.gravitational_constant 
                            * ImpactCalculations.earth_mass 
                            * ((1 / (ImpactCalculations.earth_radio + initial_height)) 
                               - (1 / (ImpactCalculations.earth_radio + 100000)))))
