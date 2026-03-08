/**
 * Vehicle Data Service
 * Integrates with NHTSA Vehicle API for Year/Make/Model data
 * Free API with comprehensive vehicle database
 */

export interface VehicleManufacturer {
  Mfr_ID: number;
  Mfr_Name: string;
  Mfr_CommonName?: string;
}

export interface VehicleYear {
  year: number;
}

export interface VehicleMake {
  Make_ID?: number; // Keep for backward compatibility
  Make_Name?: string; // Keep for backward compatibility
  MakeId: number; // Actual API format
  MakeName: string; // Actual API format
  VehicleTypeId?: number;
  VehicleTypeName?: string;
}

export interface VehicleModel {
  Model_ID?: number;
  Model_Name?: string;
  ModelId?: number; // Potential alternative API format
  ModelName?: string; // Potential alternative API format
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  makeId?: number;
  modelId?: number;
}

class VehicleDataService {
  private readonly baseUrl = "https://vpic.nhtsa.dot.gov/api/vehicles";
  private readonly formatParam = "format=json";

  // Cache for performance
  private yearCache: VehicleYear[] = [];
  private makeCache: Map<number, VehicleMake[]> = new Map();
  private modelCache: Map<string, VehicleModel[]> = new Map();

  /**
   * Get available vehicle years (typically 1980-current year)
   */
  async getVehicleYears(): Promise<VehicleYear[]> {
    if (this.yearCache.length > 0) {
      return this.yearCache;
    }

    try {
      // Generate years from 1980 to current year + 1 (for next model year)
      const currentYear = new Date().getFullYear();
      const years: VehicleYear[] = [];

      for (let year = currentYear + 1; year >= 1980; year--) {
        years.push({ year });
      }

      this.yearCache = years;
      return years;
    } catch (error) {
      console.error("Error getting vehicle years:", error);
      return [];
    }
  }

  /**
   * Get vehicle makes for a specific year
   */
  async getVehicleMakes(year: number): Promise<VehicleMake[]> {
    const cacheKey = year;
    if (this.makeCache.has(cacheKey)) {
      return this.makeCache.get(cacheKey)!;
    }

    try {
      // Use GetMakesForVehicleType to get actual makes (brand names)
      const response = await fetch(
        `${this.baseUrl}/GetMakesForVehicleType/car?${this.formatParam}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // The API returns makes (brand names like Chevrolet, Ford, Honda)
      let makes: VehicleMake[] = data.Results || [];

      // Filter out invalid names, deduplicate by name, and sort alphabetically
      const seenNames = new Set<string>();
      makes = makes
        .filter((make: VehicleMake) => {
          const name = make.MakeName?.trim();
          if (!name || typeof name !== "string") return false;
          const key = name.toUpperCase();
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        })
        .sort((a: VehicleMake, b: VehicleMake) =>
          a.MakeName!.localeCompare(b.MakeName!),
        );

      this.makeCache.set(cacheKey, makes);
      return makes;
    } catch (error) {
      console.error("Error fetching vehicle makes:", error);
      return [];
    }
  }

  /**
   * Get vehicle models for a specific make and year
   */
  async getVehicleModels(
    makeName: string,
    year: number,
  ): Promise<VehicleModel[]> {
    const cacheKey = `${makeName}-${year}`;
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    try {
      // Use the correct NHTSA API endpoint format
      const response = await fetch(
        `${this.baseUrl}/GetModelsForMakeYear/make/${encodeURIComponent(
          makeName,
        )}/modelyear/${year}?${this.formatParam}`,
      );

      if (!response.ok) {
        console.error(`API Error: ${response.status} - ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let models: VehicleModel[] = data.Results || [];

      // Filter out invalid names, deduplicate by name, and sort alphabetically
      const seenModels = new Set<string>();
      models = models
        .filter((model: VehicleModel) => {
          const name = (model.Model_Name || model.ModelName)?.trim();
          if (!name || typeof name !== "string") return false;
          const key = name.toUpperCase();
          if (seenModels.has(key)) return false;
          seenModels.add(key);
          return true;
        })
        .sort((a: VehicleModel, b: VehicleModel) => {
          const aName = a.Model_Name || a.ModelName || "";
          const bName = b.Model_Name || b.ModelName || "";
          return aName.localeCompare(bName);
        });

      this.modelCache.set(cacheKey, models);
      return models;
    } catch (error) {
      console.error("Error fetching vehicle models:", error);
      return [];
    }
  }

  /**
   * Search makes by name (for autocomplete)
   */
  async searchMakes(query: string, year: number): Promise<VehicleMake[]> {
    const allMakes = await this.getVehicleMakes(year);

    if (!query.trim()) {
      return allMakes.slice(0, 20); // Return top 20 if no query
    }

    const searchTerm = query.toLowerCase();
    return allMakes
      .filter(
        (make) =>
          make.MakeName && make.MakeName.toLowerCase().includes(searchTerm),
      )
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Search models by name (for autocomplete)
   */
  async searchModels(
    query: string,
    makeName: string,
    year: number,
  ): Promise<VehicleModel[]> {
    const allModels = await this.getVehicleModels(makeName, year);

    if (!query.trim()) {
      return allModels.slice(0, 20); // Return top 20 if no query
    }

    const searchTerm = query.toLowerCase();
    return allModels
      .filter((model) => {
        const modelName = model.Model_Name || model.ModelName || "";
        return modelName.toLowerCase().includes(searchTerm);
      })
      .slice(0, 10); // Limit to 10 results
  }

  /**
   * Get vehicle specifications by make, model, and year
   */
  async getVehicleSpecifications(
    make: string,
    model: string,
    year: number,
  ): Promise<any> {
    try {
      // Try to get specifications using the WMI/VDS approach
      const response = await fetch(
        `${this.baseUrl}/DecodeVINValues/5UXFE83578L342934?${this.formatParam}`, // Example VIN for testing
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Vehicle Specifications:", JSON.stringify(data, null, 2));

      return data.Results || [];
    } catch (error) {
      console.error("Error fetching vehicle specifications:", error);
      return null;
    }
  }

  /**
   * Get detailed vehicle specifications by VIN
   */
  async getDetailedVehicleInfo(vin: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/DecodeVin/${vin}?${this.formatParam}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Detailed Vehicle Info:", JSON.stringify(data, null, 2));

      // Extract useful information like engine type, transmission, etc.
      const results = data.Results || [];
      const vehicleSpecs: any = {};

      results.forEach((item: any) => {
        if (item.Variable && item.Value) {
          vehicleSpecs[item.Variable] = item.Value;
        }
      });

      return vehicleSpecs;
    } catch (error) {
      console.error("Error fetching detailed vehicle info:", error);
      return null;
    }
  }

  /**
   * Get vehicle info by VIN (bonus feature)
   */
  async getVehicleByVin(vin: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/DecodeVin/${vin}?${this.formatParam}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.Results || [];
    } catch (error) {
      console.error("Error decoding VIN:", error);
      return null;
    }
  }

  /**
   * Get available vehicle variables from NHTSA API
   */
  async getVehicleVariables(): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/GetVehicleVariableList?${this.formatParam}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        "Available Vehicle Variables:",
        JSON.stringify(data, null, 2),
      );
      return data.Results || [];
    } catch (error) {
      console.error("Error fetching vehicle variables:", error);
      return [];
    }
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.yearCache = [];
    this.makeCache.clear();
    this.modelCache.clear();
  }
}

export const vehicleDataService = new VehicleDataService();
