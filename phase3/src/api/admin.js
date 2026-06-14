import apiClient from "./client";

function unwrap(response) {
  return response.data?.data || response.data;
}

export async function adminPendingWithdrawalsRequest() {
  const response = await apiClient.get("/withdrawals/admin/pending");
  return unwrap(response);
}

export async function adminReviewWithdrawalRequest(withdrawalId, payload) {
  const response = await apiClient.patch(`/withdrawals/admin/${withdrawalId}/review`, payload);
  return unwrap(response);
}
