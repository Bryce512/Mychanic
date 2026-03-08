export type userProfile = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  address: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  cars: number[] | null;
  role: "user" | "mechanic" | "admin" | null;
};

export type vehicle = {
  id: string;
  nickname: string;
  image: string;
  lastSync: string;
  obd: string;
  status: "Active" | "Inactive" | "Maintenance";
  progress: number;
  alerts: number;
  mileage: number;
  lastService: string;
  nextService: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
  ownerId: string[]; // Array to allow multiple owners
};

export type Diagnostic = {
  code: string;
  description: string;
  severity: "High" | "Moderate" | "Low";
  details: string;
  dateDetected: string;
};

export type DiagnosticData = {
  userProfile: userProfile | null;
  vehicle: vehicle | null;
  diagnostic: Diagnostic | null;
};

export type Job = {
  id: string;
  title: string;
  description: string;
  status: "available" | "claimed" | "in_progress" | "completed";
  ownerId: string;
  vehicleId: string;
  mechanicId?: string;
  claimedAt?: any;
  rating?: number;
  customerName?: string;
  customerPhone?: string;
  customerLocation?: string;
  customerZipCode?: string;
  customerLatitude?: number;
  customerLongitude?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  priority: "low" | "medium" | "high" | "critical";
  estimatedTime?: string;
  estimatedCost?: number;
  createdAt: any;
  symptoms?: string[];
  dtcCodes?: string[];
};
