import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import firebaseService from "../services/firebaseService";

// Types for diagnostics data
export interface VehicleDiagnostics {
  vehicleId: string;
  dtcCodes: string[];
  milesSinceLastOilChange: number;
  milesBetweenOilChanges: number;
  battV: number;
  battVLastTimestamp: number;
  milesSinceLastBrakeService: number;
  milesBetweenBrakeChanges: number;
  milesSinceLastTireService: number;
  milesBetweenTireService: number;
  lastSync: number;
  engineRunning?: boolean;
}

interface DiagnosticsContextType {
  diagnostics: Record<string, VehicleDiagnostics>;
  refreshDiagnostics: () => Promise<void>;
  loading: boolean;
}

const DiagnosticsContext = createContext<DiagnosticsContextType>({
  diagnostics: {},
  refreshDiagnostics: async () => {},
  loading: false,
});

export const DiagnosticsProvider = ({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId: string;
}) => {
  const [diagnostics, setDiagnostics] = useState<
    Record<string, VehicleDiagnostics>
  >({});
  const [loading, setLoading] = useState(false);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      // Fetch all vehicles for the user
      const vehicles = await firebaseService.getVehicles(userId);
      const diagMap: Record<string, VehicleDiagnostics> = {};
      // For each vehicle, fetch diagInfo from userId/vehicles/vehicleId/diagInfo
      await Promise.all(
        vehicles.map(async (v: any) => {
          try {
            const diagInfo = await firebaseService.getVehicleById(v.id);
            console.log(diagInfo);
            diagMap[v.id] = {
              vehicleId: v.id,
              dtcCodes: diagInfo?.dtcCodes || [],
              milesSinceLastOilChange:
                diagInfo?.mileage && diagInfo?.milesAtLastOilChange
                  ? Math.max(
                      0,
                      diagInfo.mileage - diagInfo.milesAtLastOilChange
                    )
                  : 0,
              milesBetweenOilChanges:
                diagInfo?.maintConfigs?.milesBetweenOilChanges ||
                diagInfo?.milesBetweenOilChanges ||
                5000,
              battV: diagInfo?.battV || 0,
              battVLastTimestamp: diagInfo?.battVLastTimestamp || Date.now(),
              milesSinceLastBrakeService:
                diagInfo?.mileage && diagInfo?.milesAtLastBrakeService
                  ? Math.max(
                      0,
                      diagInfo.mileage - diagInfo.milesAtLastBrakeService
                    )
                  : 0,
              milesBetweenBrakeChanges:
                diagInfo?.maintConfigs?.milesBetweenBrakeChanges ||
                diagInfo?.diagnosticData?.milesBetweenBrakeService ||
                diagInfo?.diagnosticData?.milesBetweenBrakeChanges ||
                diagInfo?.milesBetweenBrakeChanges ||
                30000,
              milesSinceLastTireService:
                diagInfo?.mileage && diagInfo?.milesAtLastTireService
                  ? Math.max(
                      0,
                      diagInfo.mileage - diagInfo.milesAtLastTireService
                    )
                  : 0,
              milesBetweenTireService:
                diagInfo?.maintConfigs?.milesBetweenTireService ||
                diagInfo?.diagnosticData?.milesBetweenTireService ||
                diagInfo?.milesBetweenTireService ||
                5000,
              lastSync: diagInfo?.lastSync || Date.now(),
              engineRunning: diagInfo?.engineRunning || false,
            };
          } catch (vehicleError) {
            console.error(
              `Failed to fetch diagnostics for vehicle ${v.id}:`,
              vehicleError
            );
            // Still add a default entry for this vehicle
            diagMap[v.id] = {
              vehicleId: v.id,
              dtcCodes: [],
              milesSinceLastOilChange: 0,
              milesBetweenOilChanges: 5000,
              battV: 0,
              battVLastTimestamp: Date.now(),
              milesSinceLastBrakeService: 0,
              milesBetweenBrakeChanges: 30000,
              milesSinceLastTireService: 0,
              milesBetweenTireService: 5000,
              lastSync: Date.now(),
              engineRunning: false,
            };
          }
        })
      );
      setDiagnostics(diagMap);
    } catch (e) {
      console.error("Failed to fetch diagnostics:", e);
      setDiagnostics({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <DiagnosticsContext.Provider
      value={{ diagnostics, refreshDiagnostics: fetchDiagnostics, loading }}
    >
      {children}
    </DiagnosticsContext.Provider>
  );
};

export const useDiagnostics = () => useContext(DiagnosticsContext);

// Wrapper to get userId from AuthContext and provide DiagnosticsProvider
export const DiagnosticsProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { user } = useAuth();

  // Instead of returning null, return children without the provider
  // This prevents breaking the component tree when user is not authenticated
  if (!user || !user.uid) {
    return <>{children}</>;
  }

  return (
    <DiagnosticsProvider userId={user.uid}>{children}</DiagnosticsProvider>
  );
};
