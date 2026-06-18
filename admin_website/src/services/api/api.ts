import axios from "axios";

const BASE_URL = "/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add auth token and log requests
axiosInstance.interceptors.request.use((config) => {
  console.log("Making request to:", `${config.baseURL}${config.url}`);
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("Response received:", response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullUrl: `${error.config?.baseURL}${error.config?.url}`,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);

interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

interface HealthMetrics {
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

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    role: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

class ApiService {
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    try {
      // Validate required fields
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        throw new Error("All fields are required");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        throw new Error("Invalid email format");
      }

      // Validate password length
      if (userData.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      const requestBody = {
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.trim(),
        password: userData.password,
        username: userData.email.split("@")[0],
        roleName: "ROLE_USER",
        status: "ACTIVE",
      };

      const response = await axiosInstance.post("/users/register", requestBody);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axiosInstance.post("/users/login", {
        email: data.email,
        password: data.password,
      });

      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem("user");
  }

  isAuthenticated(): boolean {
    return localStorage.getItem("user") !== null;
  }

  getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  }

  // Health check endpoint
  async checkHealth(): Promise<ApiResponse<HealthMetrics>> {
    const response = await axiosInstance.get("/health");
    return {
      data: response.data,
      status: response.status,
    };
  }
}

export const api = new ApiService();

// Dashboard API
export const dashboardApi = {
  getMetrics: () => axiosInstance.get("/dashboard/metrics"),
  getMonthlySales: (year: number) => axiosInstance.get(`/dashboard/sales/monthly?year=${year}`),
  getRecentOrders: (limit: number = 5) => axiosInstance.get(`/dashboard/orders/recent?limit=${limit}`),
  getDemographics: () => axiosInstance.get("/dashboard/demographics"),
};

// Analytics API
export const analyticsApi = {
  getGeneralAnalytics: () => axiosInstance.get("/analytics"),
  getSalesAnalytics: (storeId: number, period: string = "week") =>
    axiosInstance.get(`/analytics/sales?storeId=${storeId}&period=${period}`),
};

// Health API
export const healthApi = {
  checkHealth: () => axiosInstance.get("/health"),
};

// ... rest of the file ...