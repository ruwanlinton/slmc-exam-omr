import { apiClient } from "./client";

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
}

export const usersApi = {
  getProfile: () => apiClient.get<UserProfile>("/users/me"),
  updateProfile: (data: { name: string }) =>
    apiClient.patch<UserProfile>("/users/me", data),
};
