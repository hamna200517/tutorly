import apiClient from "./client";

function unwrap(response) {
  return response.data?.data || response.data;
}

export async function loginRequest(payload) {
  const response = await apiClient.post("/auth/login", payload);
  return unwrap(response);
}

export async function registerRequest(payload) {
  const response = await apiClient.post("/auth/register", payload);
  return unwrap(response);
}

export async function meRequest() {
  const response = await apiClient.get("/auth/me");
  return unwrap(response);
}

export async function logoutRequest(refreshToken) {
  const response = await apiClient.post("/auth/logout", {
    refresh_token: refreshToken || undefined,
  });
  return unwrap(response);
}

export async function forgotPasswordRequest(email) {
  const response = await apiClient.post("/auth/forgot-password", { email });
  return unwrap(response);
}

export async function resendVerificationRequest(email) {
  const response = await apiClient.post("/auth/resend-verification", { email });
  return unwrap(response);
}

export async function resetPasswordRequest(payload) {
  const response = await apiClient.post("/auth/reset-password", payload);
  return unwrap(response);
}
