import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { AxiosError } from "axios";
import apiClient from "../lib/api-client";
import type { LoginRequest, RegisterRequest, User } from "../lib/types";
import { useToast } from "./use-toast";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(user: User): User {
  const firstName = user.firstName || user.name?.split(" ")[0] || "User";
  const lastName = user.lastName || user.name?.split(" ").slice(1).join(" ") || "";
  const normalizedRoleValue = (user.role || user.profileType || "employee").toLowerCase();
  const mappedRole = normalizedRoleValue === "rh" || normalizedRoleValue === "hr" ? "employee" : normalizedRoleValue;
  const normalizedProfileValue = (user.profileType || user.role || "employee").toLowerCase();
  const mappedProfile = ["rh", "hr", "intern"].includes(normalizedProfileValue) ? "employee" : normalizedProfileValue;
  const role = mappedRole as User["role"];
  const profileType = mappedProfile as User["profileType"];

  return {
    ...user,
    firstName,
    lastName,
    name: user.name || `${firstName} ${lastName}`.trim(),
    role,
    profileType,
    isVerified: user.isVerified ?? true,
  };
}

function getRedirectPath(user: User) {
  const profile = user.profileType || user.role;

  switch (profile) {
    case "student":
      return "/dashboard/student";
    case "employee":
      return "/dashboard/employee";
    case "accountant":
      return "/dashboard/accountant";
    case "admin":
      return "/admin";
    default:
      return "/dashboard/employee";
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  const axiosError = error as AxiosError<{ message?: string; details?: string; code?: string }>;
  const status = axiosError.response?.status;
  const data = axiosError.response?.data;

  if (status === 503 && data?.code === "ATLAS_IP_NOT_WHITELISTED") {
    return "MongoDB Atlas blocked this IP. Add your current IP in Atlas Network Access, then restart the backend.";
  }

  if (status === 503 && data?.details) {
    return data.details;
  }

  return data?.message || fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("omni_ai_token");
      if (storedToken) {
        try {
          const { data } = await apiClient.get("/auth/me");
          setToken(storedToken);
          setUser(normalizeUser(data.data.user as User));
        } catch {
          localStorage.removeItem("omni_ai_token");
          localStorage.removeItem("omni_ai_refreshToken");
          localStorage.removeItem("omni_ai_user");
        }
      }
      setIsLoading(false);
    };

    void initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await apiClient.post("/auth/login", data);
      const { user: userData, accessToken, refreshToken } = response.data.data as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };
      const normalizedUser = normalizeUser(userData);

      localStorage.setItem("omni_ai_token", accessToken);
      localStorage.setItem("omni_ai_refreshToken", refreshToken);
      localStorage.setItem("omni_ai_user", JSON.stringify(normalizedUser));

      setToken(accessToken);
      setUser(normalizedUser);

      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation(getRedirectPath(normalizedUser));
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: getErrorMessage(error, "Invalid credentials."),
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await apiClient.post("/auth/register", data);
      const { user: userData, accessToken, refreshToken } = response.data.data as {
        user: User;
        accessToken: string;
        refreshToken: string;
      };
      const normalizedUser = normalizeUser(userData);

      localStorage.setItem("omni_ai_token", accessToken);
      localStorage.setItem("omni_ai_refreshToken", refreshToken);
      localStorage.setItem("omni_ai_user", JSON.stringify(normalizedUser));

      setToken(accessToken);
      setUser(normalizedUser);

      toast({ title: "Account created!", description: "Your account is ready." });
      setLocation(getRedirectPath(normalizedUser));
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: getErrorMessage(error, "Could not create account."),
      });
      throw error;
    }
  };

  const logout = () => {
    try {
      void apiClient.post("/auth/logout");
    } catch {
      // noop
    }
    localStorage.removeItem("omni_ai_token");
    localStorage.removeItem("omni_ai_refreshToken");
    localStorage.removeItem("omni_ai_user");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
