import { axiosInstance } from "./api";

export interface HealthMetrics {
  heapMemoryUsage: {
    used: number;
    max: number;
  };
  nonHeapMemoryUsage: {
    used: number;
    max: number;
  };
  threadCount: number;
  uptime: number;
  systemLoad: number;
  freeMemory: number;
  totalMemory: number;
  maxMemory: number;
}

export const getSystemMetrics = async (): Promise<HealthMetrics> => {
  const response = await axiosInstance.get<HealthMetrics>("/health");
  return response.data;
}; 