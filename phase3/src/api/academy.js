import apiClient from "./client";

function unwrap(response) {
  return response.data?.data || response.data;
}

export async function academyStatusRequest() {
  const response = await apiClient.get("/subscriptions/academy/status");
  return unwrap(response);
}

export async function academySubscriptionsRequest() {
  const response = await apiClient.get("/subscriptions/academy/my");
  return unwrap(response);
}

export async function academyTopupRequest(amount) {
  const response = await apiClient.post("/subscriptions/academy/topup", { amount });
  return unwrap(response);
}

export async function academyPurchaseSubscriptionRequest() {
  const response = await apiClient.post("/subscriptions/academy/purchase", { plan_type: "1m" });
  return unwrap(response);
}

export async function academySeedCoursesRequest() {
  const response = await apiClient.post("/academies/academy/courses/seed-demo");
  return unwrap(response);
}

export async function academyEnrollmentsRequest() {
  const response = await apiClient.get("/academies/enrollments/my");
  return unwrap(response);
}

export async function academyConversationsRequest() {
  const response = await apiClient.get("/chat/conversations");
  return unwrap(response);
}

export async function academyThreadRequest(peerAccountId, params = {}) {
  const response = await apiClient.get(`/chat/messages/${peerAccountId}`, { params });
  return unwrap(response);
}

export async function academySendMessageRequest(payload) {
  const response = await apiClient.post("/chat/messages", payload);
  return unwrap(response);
}

export async function academyChatContactsRequest() {
  const response = await apiClient.get("/chat/contacts");
  return unwrap(response);
}
