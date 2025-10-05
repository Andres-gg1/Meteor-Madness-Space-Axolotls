import math

class PropertiesCalculations:
    taxonomic_classes = [
        {"complex": 'A', "albedo": 0.2, "minDensity": 3.2},
        {"complex": 'C', "albedo": 0.101, "minDensity": 0.8},
        {"complex": 'D', "albedo": 0.042, "minDensity": 0.8},
        {"complex": 'O', "albedo": 0.52, "minDensity": 2.5},
        {"complex": 'Q', "albedo": 0.247, "minDensity": 2.3},
        {"complex": 'R', "albedo": 0.34, "minDensity": 3},
        {"complex": 'S', "albedo": 0.239, "minDensity": 2.0},
        {"complex": 'U', "albedo": 0.3, "minDensity": 2},
        {"complex": 'V', "albedo": 0.417, "minDensity": 2.9},
        {"complex": 'X', "albedo": 0.072, "minDensity": 2}
    ]

    earth_radio = 6.371 * math.pow(10, 6) # m

    @staticmethod
    def calculateKineticEnergyByDiameter(diameter, density, velocity): 
        # This function calculates the kinetic energy of an asteroid based on diameter, density and velocity
        return (math.pi/12) * math.pow(diameter,3) * density * 1000 * math.pow(velocity, 2)

    @staticmethod
    def calculateKineticEnergyByMass(mass, velocity): 
        # This function calculates the kinetic energy of the asteroid based on mass and velocity
        return 0.5 * mass * math.pow(velocity, 2)

    def aproximateDensityWithAlbedo(self, albedo):
        closest_class = self.taxonomic_classes[0]
        min_diff = abs(albedo - closest_class["albedo"])

        for taxonomic_class in self.taxonomic_classes[1:]:
            diff = abs(albedo - taxonomic_class["albedo"])
            if (diff < min_diff):
                closest_class = taxonomic_class
                min_diff = diff
        
        return closest_class["minDensity"]
    
    @staticmethod
    def convertJoulesTNTTons(joules):
        return joules / (4.184 * math.pow(10, 9))
    
    @staticmethod
    def convertJoulesHiroshima(joules):
        return joules / (6.3 * math.pow(10, 13))
    
    def aproximateFragmentationEnergy(kinetic_energy):
        return kinetic_energy * 0.01
    
    def aproximateSafeDistance(asteroid_diameter):
        return asteroid_diameter / 0.01
