import { apiClient } from "./client";

export interface AsgardeoUser {
  id: string;
  userName: string;
  givenName: string;
  familyName: string;
  email: string;
}

export const adminUsersApi = {
  list: () => apiClient.get<AsgardeoUser[]>("/admin/users"),
  create: (data: { given_name: string; family_name: string; email: string }) =>
    apiClient.post<AsgardeoUser>("/admin/users", data),
  update: (id: string, data: { given_name: string; family_name: string }) =>
    apiClient.patch<AsgardeoUser>(`/admin/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/admin/users/${id}`),
};
