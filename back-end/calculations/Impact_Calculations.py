import math
import numpy

class ImpactCalculations:

    #Earth impact constants
    K1 = 1
    u = 0.55
    v = 0.17
    b = 2.5 # value between 2 and 3, 2.5 for an average result
    c = 0.5
    gravity = 9.81 #m/s2
    gravitational_constant = 6.674 * math.pow(10, -11) # Nm2/kg2
    earth_mass = 5.972 * math.pow(10, 24) # kg
    earth_radio = 6.371 * math.pow(10, 6) # m
    escape_velocity = 11186 #m/s

    @staticmethod
    def calculateGroupPI(diameter, velocity): 
        # Group Pi is a variable without units that is needed to calculate the diameter of the impact crater
        return (ImpactCalculations.gravity * diameter) / math.pow(velocity, 2)

    @staticmethod
    def calculateInitialCraterDiameter(asteroid_diameter, asteroid_density, asteroid_velocity, ground_density): 
        # This function calculates the initial diameter that the crater has right after the asteroid crashes into the earth
        return (ImpactCalculations.K1 
                * math.pow((asteroid_density/ground_density), ImpactCalculations.u) 
                * math.pow(ImpactCalculations.calculateGroupPI(asteroid_diameter, asteroid_velocity),
                            - ImpactCalculations.v)
                * asteroid_diameter)
    
    @staticmethod
    def calculateFinalCraterDiameter(initial_diameter): 
        # This function calculates the diameter that the crater ends up with after the earth shifts into a stable shape
        return initial_diameter * 1.25
    
    @staticmethod
    def calculateExcavatedMass(initial_diameter, ground_density): 
        # This function calculates the mass of the dirt that got expelled from the ground after the impact
        return (math.pi / 24) * math.pow(initial_diameter, 3) * ground_density * 1000

    @staticmethod
    def calculateMinimalEjectionVelocity(initial_diameter): 
        # This function calculates the minimal velocity that the expelled dirt reaches after the impact of the asteroid
        return math.sqrt(ImpactCalculations.gravity * (initial_diameter / 2))

    @staticmethod
    def calculateMaximumEjectionVelocity(asteroid_velocity): 
        # This function calculates the peak of the velocity that the expelled dirt reaches after impact
        return asteroid_velocity * ImpactCalculations.c
    
    @staticmethod
    def calculateStratosphereVelocity(latitude):
        # This function calculates the velocity that an object needs to reach the stratosphere, since the height of the stratosphere changes depending on the latitude
        return math.sqrt(4 
                         * ImpactCalculations.gravity 
                         * numpy.interp(abs(latitude), [0, 90], [20000, 7000]))
    
    @staticmethod
    def calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, target_velocity):
        # This function calculates the percentage of dirt that was expelled from the ground to reach a target velocity
        return math.pow((minimal_ejection_velocity / target_velocity), ImpactCalculations.b)
    
    @staticmethod
    def calculateMassToReachStratosphere(latitude, minimal_ejection_velocity, excavated_mass):
        # This function calculates the mass of the expelled dirt that reaches the stratosphere
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, ImpactCalculations.calculateStratosphereVelocity(latitude))
    
    @staticmethod
    def calculateMassToEscapeGravity(minimal_ejection_velocity, excavated_mass):
        # This function calculates the mass of the expelled dirt that escapes the earth's gravity
        return excavated_mass * ImpactCalculations.calculatePercentageToReachTargetVelocity(minimal_ejection_velocity, ImpactCalculations.escape_velocity)
    
    @staticmethod
    def calculateGravityAccelerationByHeight(height):
        # Calculates the acceleration of the gravity depending on the height of the object
        return (ImpactCalculations.gravitational_constant * ImpactCalculations.earth_mass) / math.pow((ImpactCalculations.earth_radio + height), 2)
    
    @staticmethod
    def calculateVelocityOnEntranceToAtmosphere(initial_velocity, initial_height):
        # Calculates the final velocity of the asteroid up until it reaches the atmosphere
        return math.sqrt(math.pow(initial_velocity, 2) 
                         + (2 
                            * ImpactCalculations.gravitational_constant 
                            * ImpactCalculations.earth_mass 
                            * ((1 / (ImpactCalculations.earth_radio + initial_height)) 
                               - (1 / (ImpactCalculations.earth_radio + 100000)))))