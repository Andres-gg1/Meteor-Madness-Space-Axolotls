import math

class PropertiesCalculations:
    """
    ALL DENSITIES IN THIS CLASS ARE IN g/cm³ (NASA API format)
    Use convert_density_to_kg_m3() when needed for calculations
    """
    taxonomic_classes = [
        {"complex": 'D', "albedo": 0.042, "minDensity": 0.8},   # g/cm³
        {"complex": 'X', "albedo": 0.072, "minDensity": 2.0},   # g/cm³
        {"complex": 'C', "albedo": 0.101, "minDensity": 0.8},   # g/cm³
        {"complex": 'A', "albedo": 0.2, "minDensity": 3.2},     # g/cm³
        {"complex": 'S', "albedo": 0.239, "minDensity": 2.0},   # g/cm³
        {"complex": 'Q', "albedo": 0.247, "minDensity": 2.3},   # g/cm³
        {"complex": 'U', "albedo": 0.3, "minDensity": 2.0},     # g/cm³
        {"complex": 'R', "albedo": 0.34, "minDensity": 3.0},    # g/cm³
        {"complex": 'V', "albedo": 0.417, "minDensity": 2.9},   # g/cm³
        {"complex": 'O', "albedo": 0.52, "minDensity": 2.5}     # g/cm³
    ]
    
    @staticmethod
    def convert_density_to_kg_m3(density_g_cm3):
        """Convert density from g/cm³ to kg/m³"""
        return density_g_cm3 * 1000
    
    @staticmethod
    def convert_density_to_g_cm3(density_kg_m3):
        """Convert density from kg/m³ to g/cm³"""
        return density_kg_m3 / 1000
    
    @staticmethod
    def calculateKineticEnergyByDiameter(diameter, density_g_cm3, velocity): 
        """
        Calculate kinetic energy from diameter.
        
        Args:
            diameter: diameter in meters
            density_g_cm3: density in g/cm³
            velocity: velocity in m/s
        
        Returns:
            Kinetic energy in Joules
        """
        # CONVERT to kg/m³ for calculation
        density_kg_m3 = PropertiesCalculations.convert_density_to_kg_m3(density_g_cm3)
        volume = (math.pi / 6) * math.pow(diameter, 3)
        mass = volume * density_kg_m3
        return 0.5 * mass * math.pow(velocity, 2)
    
    @staticmethod
    def calculateKineticEnergyByMass(mass, velocity): 
        """
        Calculate kinetic energy from mass.
        
        Args:
            mass: mass in kg
            velocity: velocity in m/s
        
        Returns:
            Kinetic energy in Joules
        """
        return 0.5 * mass * math.pow(velocity, 2)
    
    def aproximateDensityWithAlbedo(self, albedo):
        """
        Interpolate density based on albedo.
        
        Args:
            albedo: value between 0 and 1
        
        Returns:
            tuple: (density in g/cm³, complex type)
        """
        classes = sorted(self.taxonomic_classes, key=lambda x: x["albedo"])
        
        for i in range(len(classes) - 1):
            a1, a2 = classes[i]["albedo"], classes[i + 1]["albedo"]
            d1, d2 = classes[i]["minDensity"], classes[i + 1]["minDensity"]
            c1, c2 = classes[i]["complex"], classes[i + 1]["complex"]
            
            if a1 <= albedo <= a2:
                t = (albedo - a1) / (a2 - a1)
                density_g_cm3 = d1 + t * (d2 - d1)
                complex_type = c1 if abs(albedo - a1) < abs(albedo - a2) else c2
                return density_g_cm3, complex_type
        
        # Values outside range
        if albedo < classes[0]["albedo"]:
            return classes[0]["minDensity"], classes[0]["complex"]
        return classes[-1]["minDensity"], classes[-1]["complex"]
    
    @staticmethod
    def convertJoulesTNTTons(joules):
        """Convert Joules to tons of TNT"""
        return joules / 4.184e9
    
    @staticmethod
    def convertJoulesHiroshima(joules):
        """Convert Joules to Hiroshima equivalents"""
        return joules / 6.3e13
    
    @staticmethod
    def aproximateFragmentationEnergy(kinetic_energy):
        """Estimate fragmentation energy (~1% of kinetic energy)"""
        return kinetic_energy * 0.01
    
    @staticmethod
    def aproximateSafeDistance(asteroid_diameter):
        """
        Estimate safe distance in meters.
        Note: Formula returns diameter * 100
        """
        return asteroid_diameter / 0.01
    
    @classmethod
    def estimateMass(cls, diameter, albedo):
        density_g_cm3, complex_type = cls().aproximateDensityWithAlbedo(albedo)
        # CONVERT to kg/m³ for mass calculation
        density_kg_m3 = cls.convert_density_to_kg_m3(density_g_cm3)
        volume = (math.pi / 6) * diameter**3
        mass = volume * density_kg_m3
        return mass, density_g_cm3, complex_type


# EJEMPLO DE USO CORRECTO
if __name__ == "__main__":
    # Datos del asteroide 1221 Amor
    diameter = 1443.92  # metros
    albedo = 0.15  # ejemplo
    
    # Calcular masa y densidad
    mass, density_g_cm3, complex_type = PropertiesCalculations.estimateMass(diameter, albedo)
    
    # CONVERTIR DENSIDAD PARA MOSTRAR
    density_kg_m3 = PropertiesCalculations.convert_density_to_kg_m3(density_g_cm3)
    
    print(f"**Name:** 1221 Amor (1932 EA1)")
    print(f"**Designation:** 1221")
    print(f"**Absolute Magnitude (H):** 17.37 mag")
    print(f"**Estimated Diameter:** 892.39 m - 1995.45 m (avg: 1443.92 m)")
    print(f"**Potentially Hazardous:** No")
    print(f"**Estimated Density:** {density_kg_m3:.2f} kg/m³ (Based on albedo & taxonomic type, approximate)")
    print(f"**Taxonomic Type:** {complex_type}")
    print(f"**Estimated Mass:** {mass:.2e} kg")