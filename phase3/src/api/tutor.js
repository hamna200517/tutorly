import apiClient from "./client";

function unwrap(response) {
  return response.data?.data || response.data;
}

export async function tutorStatusRequest() {
  const response = await apiClient.get("/subscriptions/tutor/status");
  return unwrap(response);
}

export async function tutorSubscriptionsRequest() {
  const response = await apiClient.get("/subscriptions/tutor/my");
  return unwrap(response);
}

export async function tutorTopupRequest(amount) {
  const response = await apiClient.post("/subscriptions/tutor/topup", { amount });
  return unwrap(response);
}

export async function tutorPurchasePlanRequest(planType) {
  const response = await apiClient.post("/subscriptions/tutor/purchase", { plan_type: planType });
  return unwrap(response);
}

export async function tutorBookingsRequest() {
  const response = await apiClient.get("/sessions/bookings/my");
  return unwrap(response);
}

export async function tutorConfirmBookingRequest(bookingId, confirmed) {
  const response = await apiClient.post(`/sessions/bookings/${bookingId}/confirm`, {
    confirmed,
  });
  return unwrap(response);
}

export async function tutorWithdrawalsRequest() {
  const response = await apiClient.get("/withdrawals/my");
  return unwrap(response);
}

export async function tutorRequestWithdrawalRequest(payload) {
  const response = await apiClient.post("/withdrawals/request", payload);
  return unwrap(response);
}

export async function tutorReviewsRequest() {
  const response = await apiClient.get("/reviews/my");
  return unwrap(response);
}

export async function tutorConversationsRequest() {
  const response = await apiClient.get("/chat/conversations");
  return unwrap(response);
}

export async function tutorThreadRequest(peerAccountId, params = {}) {
  const response = await apiClient.get(`/chat/messages/${peerAccountId}`, { params });
  return unwrap(response);
}

export async function tutorSendMessageRequest(payload) {
  const response = await apiClient.post("/chat/messages", payload);
  return unwrap(response);
}

export async function tutorChatContactsRequest() {
  const response = await apiClient.get("/chat/contacts");
  return unwrap(response);
}
