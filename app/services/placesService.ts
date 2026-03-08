// Google Places API service for finding nearby mechanic shops
export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating?: number;
  reviewCount?: number;
  isOpen?: boolean;
  photoUrl?: string;
  phoneNumber?: string;
  website?: string;
  priceLevel?: number;
  distance?: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId?: string;
}

export interface AddressSuggestion {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

// Note: You'll need to add your Google Places API key here
const GOOGLE_PLACES_API_KEY = "AIzaSyDH_5rYB8ja6e6xtjZ5hmmN7NosXNEpeI8"; // Replace with your actual API key

// Enable this for development if you don't have API key working yet
const USE_MOCK_DATA_FALLBACK = false; // Set to false when API key is properly configured

const PLACES_API_BASE_URL = "https://maps.googleapis.com/maps/api/place";
const PLACES_NEW_API_BASE_URL = "https://places.googleapis.com/v1";

export class PlacesService {
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Radius of the Earth in miles
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Round to 1 decimal place
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Helper function to generate photo URL when needed (to avoid automatic photo API calls)
  static getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
    // Check if it's a new API photo name (starts with places/)
    if (photoReference.startsWith("places/")) {
      return `${PLACES_NEW_API_BASE_URL}/${photoReference}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_PLACES_API_KEY}`;
    }
    // Fallback to old API format
    return `${PLACES_API_BASE_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
  }

  // Enhance results with detailed information including phone numbers
  private static async enhanceWithDetails(
    places: PlaceResult[]
  ): Promise<PlaceResult[]> {
    const enhancedPlaces = await Promise.all(
      places.map(async (place) => {
        try {
          const details = await this.getPlaceDetails(place.id);
          if (details) {
            return {
              ...place,
              phoneNumber: details.formatted_phone_number,
              website: details.website,
              // Update opening hours if available
              isOpen: details.opening_hours?.open_now ?? place.isOpen,
            };
          }
          return place;
        } catch (error) {
          console.error(`Error getting details for ${place.name}:`, error);
          return place;
        }
      })
    );

    return enhancedPlaces;
  }

  static async searchNearbyMechanics(
    latitude: number,
    longitude: number,
    radius: number = 10000, // 10km radius in meters
    minResults: number = 5 // Minimum number of results to try to get
  ): Promise<PlaceResult[]> {
    // If API key is not working, return mock data
    if (
      USE_MOCK_DATA_FALLBACK ||
      !GOOGLE_PLACES_API_KEY ||
      GOOGLE_PLACES_API_KEY.includes("YOUR_")
    ) {
      console.log("Using mock data fallback");
      return getMockMechanicData(latitude, longitude);
    }

    let currentRadius = radius;
    let attempts = 0;
    const maxAttempts = 3;
    const maxRadius = 50000; // 50km max

    while (attempts < maxAttempts && currentRadius <= maxRadius) {
      try {
        console.log(
          `Searching with radius: ${currentRadius}m (attempt ${attempts + 1})`
        );

        // Search for auto repair shops using NEW Places API
        const searchUrl = `${PLACES_NEW_API_BASE_URL}/places:searchNearby`;

        const requestBody = {
          includedTypes: ["car_repair"],
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: {
                latitude: latitude,
                longitude: longitude,
              },
              radius: currentRadius,
            },
          },
        };

        console.log("Making Places API (New) request to:", searchUrl);

        const response = await fetch(searchUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.priceLevel",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        console.log("Places API (New) Response:", response.status);

        if (response.ok && data.places) {
          console.log(`Found ${data.places.length} nearby mechanics`);
          const places: PlaceResult[] = data.places.map((place: any) => {
            const distance = this.calculateDistance(
              latitude,
              longitude,
              place.location.latitude,
              place.location.longitude
            );

            return {
              id: place.id,
              name: place.displayName?.text || place.displayName,
              address: place.formattedAddress,
              latitude: place.location.latitude,
              longitude: place.location.longitude,
              rating: place.rating,
              reviewCount: place.userRatingCount,
              isOpen: place.currentOpeningHours?.openNow,
              // Don't load photos immediately to save costs - load them on demand
              photoUrl: place.photos?.[0]?.name
                ? place.photos[0].name // Store photo name for new API
                : undefined,
              priceLevel: place.priceLevel,
              distance,
            };
          });

          const sortedPlaces = places.sort(
            (a, b) => (a.distance || 0) - (b.distance || 0)
          );

          // Enhance the first few results with detailed information (including phone numbers)
          const enhancedPlaces = await this.enhanceWithDetails(
            sortedPlaces.slice(0, 5)
          );

          // Combine enhanced results with remaining basic results
          const finalResults = [...enhancedPlaces, ...sortedPlaces.slice(5)];

          // If we have enough results or reached max attempts, return
          if (
            finalResults.length >= minResults ||
            attempts === maxAttempts - 1
          ) {
            return finalResults;
          }

          // Otherwise, expand radius and try again
          currentRadius *= 2;
          attempts++;
          console.log(
            `Only found ${finalResults.length} mechanics, expanding search radius to ${currentRadius}m`
          );
        } else {
          console.error(
            "Places API (New) Error:",
            response.status,
            data?.error
          );
          if (response.status === 403) {
            console.error(
              "API Key Issue: Check your Google Cloud Console settings"
            );
            console.error("1. Ensure Places API (New) is enabled");
            console.error(
              "2. Check API key restrictions (iOS bundle ID: com.bryce512.Mychanic)"
            );
            console.error("3. Verify billing is enabled on your project");
          }
          console.log("Falling back to mock data due to API error");
          return getMockMechanicData(latitude, longitude);
        }
      } catch (error) {
        console.error("Error fetching nearby mechanics:", error);
        break; // Exit loop on network error
      }
    }

    // Final fallback
    console.log("Falling back to mock data due to insufficient results");
    return getMockMechanicData(latitude, longitude);
  }
  static async getPlaceDetails(placeId: string): Promise<any> {
    try {
      // Use the NEW Places API that has 10,000 free requests per month
      const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}?fields=id,displayName,rating,nationalPhoneNumber,websiteUri,regularOpeningHours,photos&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(detailsUrl);
      const data = await response.json();

      if (response.ok && data) {
        // Convert new API format to match old format for compatibility
        return {
          name: data.displayName?.text || data.displayName,
          rating: data.rating,
          formatted_phone_number: data.nationalPhoneNumber,
          website: data.websiteUri,
          opening_hours: {
            open_now: data.regularOpeningHours?.openNow,
          },
          photos: data.photos,
        };
      } else {
        console.error(
          "Place Details Error (New API):",
          response.status,
          data?.error
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
      return null;
    }
  }

  // Alternative search by text (for search functionality)
  static async searchMechanicsByText(
    query: string,
    latitude: number,
    longitude: number,
    radius: number = 10000
  ): Promise<PlaceResult[]> {
    try {
      const searchUrl = `${PLACES_NEW_API_BASE_URL}/places:searchText`;

      const requestBody = {
        textQuery: query + " auto repair mechanic",
        locationBias: {
          circle: {
            center: {
              latitude: latitude,
              longitude: longitude,
            },
            radius: radius,
          },
        },
        maxResultCount: 20,
      };

      const response = await fetch(searchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.photos,places.priceLevel",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.places) {
        const places: PlaceResult[] = data.places.map((place: any) => {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            place.location.latitude,
            place.location.longitude
          );

          return {
            id: place.id,
            name: place.displayName?.text || place.displayName,
            address: place.formattedAddress,
            latitude: place.location.latitude,
            longitude: place.location.longitude,
            rating: place.rating,
            reviewCount: place.userRatingCount,
            isOpen: place.currentOpeningHours?.openNow,
            // Don't load photos immediately to save costs - load them on demand
            photoUrl: place.photos?.[0]?.name
              ? place.photos[0].name // Store photo name for new API
              : undefined,
            priceLevel: place.priceLevel,
            distance,
          };
        });

        const sortedPlaces = places.sort(
          (a, b) => (a.distance || 0) - (b.distance || 0)
        );

        // Enhance the first few results with detailed information (including phone numbers)
        const enhancedPlaces = await this.enhanceWithDetails(
          sortedPlaces.slice(0, 5)
        );

        // Combine enhanced results with remaining basic results
        const finalResults = [...enhancedPlaces, ...sortedPlaces.slice(5)];

        return finalResults;
      } else {
        console.error(
          "Text Search Error (New API):",
          response.status,
          data?.error
        );
        return [];
      }
    } catch (error) {
      console.error("Error searching mechanics:", error);
      return [];
    }
  }

  // Validate and geocode an address to ensure it can be used for mechanic services
  static async validateAndGeocodeAddress(
    address: string
  ): Promise<GeocodeResult | null> {
    try {
      // If API key is not working, return mock validation for development
      if (
        USE_MOCK_DATA_FALLBACK ||
        !GOOGLE_PLACES_API_KEY ||
        GOOGLE_PLACES_API_KEY.includes("YOUR_")
      ) {
        console.log("Using mock geocoding validation");
        return this.mockGeocodeAddress(address);
      }

      // Use Google Geocoding API to validate the address
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_PLACES_API_KEY}`;

      const response = await fetch(geocodeUrl);
      const data = await response.json();

      if (
        response.ok &&
        data.status === "OK" &&
        data.results &&
        data.results.length > 0
      ) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
        };
      } else {
        console.error("Geocoding failed:", data.status, data.error_message);
        return null;
      }
    } catch (error) {
      console.error("Error geocoding address:", error);
      return null;
    }
  }

  // Get address suggestions/autocomplete using free Nominatim API
  static async getAddressSuggestions(
    query: string,
    limit: number = 5
  ): Promise<AddressSuggestion[]> {
    if (!query.trim() || query.length < 3) {
      return [];
    }

    try {
      // Use Nominatim API (OpenStreetMap) - completely free, no API key required
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&addressdetails=1&limit=${limit}&countrycodes=us&dedupe=1`;

      const response = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "Mychanic/1.0 (brycem512@gmail.com)", // Required by Nominatim
        },
      });

      if (!response.ok) {
        console.error("Nominatim API error:", response.status);
        return [];
      }

      const data = await response.json();

      return data.map((result: any) => ({
        placeId:
          result.place_id?.toString() ||
          result.osm_id?.toString() ||
          Math.random().toString(),
        displayName: result.display_name,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      }));
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      return [];
    }
  }

  // Mock geocoding for development when API key is not available
  private static mockGeocodeAddress(address: string): GeocodeResult | null {
    // Simple validation - check if address has basic components
    if (!address || address.trim().length < 10) {
      return null;
    }

    // Check for basic address components (street number, street name, city, state/zip)
    const hasStreetNumber = /\d+/.test(address);
    const hasStreetName = /[A-Za-z]/.test(address);
    const hasCityState = /,/.test(address) || /\d{5}/.test(address);

    if (!hasStreetNumber || !hasStreetName || !hasCityState) {
      return null;
    }

    // Return mock coordinates (Austin, TX area for development)
    return {
      latitude: 30.2672 + (Math.random() - 0.5) * 0.1, // Random variation around Austin
      longitude: -97.7431 + (Math.random() - 0.5) * 0.1,
      formattedAddress: address.trim(),
    };
  }
}

// Mock data fallback when API key is not configured
export const getMockMechanicData = (
  latitude: number,
  longitude: number
): PlaceResult[] => {
  const mockData = [
    {
      id: "1",
      name: "Precision Auto Care",
      address: "123 Main St, Austin, TX",
      latitude: latitude + 0.01,
      longitude: longitude + 0.01,
      rating: 4.8,
      reviewCount: 243,
      isOpen: true,
      distance: 1.2,
      phoneNumber: "(512) 555-0123",
      website: "https://precisionautocare.com",
    },
    {
      id: "2",
      name: "Hometown Mechanics",
      address: "456 Oak Ave, Austin, TX",
      latitude: latitude + 0.02,
      longitude: longitude - 0.01,
      rating: 4.6,
      reviewCount: 187,
      isOpen: false,
      distance: 2.4,
      phoneNumber: "(512) 555-0456",
      website: "https://hometownmechanics.com",
    },
    {
      id: "3",
      name: "AutoTech Solutions",
      address: "789 Pine Rd, Austin, TX",
      latitude: latitude - 0.01,
      longitude: longitude + 0.02,
      rating: 4.9,
      reviewCount: 311,
      isOpen: true,
      distance: 3.1,
      phoneNumber: "(512) 555-0789",
      website: "https://autotechsolutions.com",
    },
    {
      id: "4",
      name: "Quick Lube Express",
      address: "321 Elm St, Austin, TX",
      latitude: latitude + 0.015,
      longitude: longitude - 0.015,
      rating: 4.2,
      reviewCount: 156,
      isOpen: true,
      distance: 1.8,
      phoneNumber: "(512) 555-0321",
    },
    {
      id: "5",
      name: "Expert Auto Repair",
      address: "654 Maple Dr, Austin, TX",
      latitude: latitude - 0.015,
      longitude: longitude - 0.01,
      rating: 4.7,
      reviewCount: 298,
      isOpen: false,
      distance: 2.9,
      phoneNumber: "(512) 555-0654",
      website: "https://expertautorepair.com",
    },
  ];

  return mockData.sort((a, b) => a.distance - b.distance);
};
