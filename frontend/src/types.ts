export interface Car {
  id: string; // Firestore document ID
  make: string;
  model: string;
  year: number;
  vin?: string; // Optional field
}

export interface DataPoint {
  timestamp: string;
  speed: number;
  rpm: number;
  throttle: number;
}

export interface Session {
  id?: string; // Optional Firestore document ID
  carId: string;
  userId: string;
  startTime: string;
  endTime: string;
  dataPoints: DataPoint[];
}

export interface DTCLog {
  id?: string;
  carId: string;
  userId: string;
  dtcCode: string;
  timestamp: string;
  context?: Record<string, any>; // Can store any extra diagnostic info
}
