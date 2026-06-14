import apiClient from "./client";

function unwrap(response) {
  return response.data?.data || response.data;
}

export async function studentTopupRequest(amount) {
  const response = await apiClient.post("/sessions/student/topup", { amount });
  return unwrap(response);
}

export async function studentBookingsRequest() {
  const response = await apiClient.get("/sessions/bookings/my");
  return unwrap(response);
}

export async function studentEnrollmentsRequest() {
  const response = await apiClient.get("/academies/enrollments/my");
  return unwrap(response);
}

export async function studentTutorsRequest() {
  const response = await apiClient.get("/sessions/tutors");
  return unwrap(response);
}

export async function tutorSlotsRequest(tutorId, date) {
  const response = await apiClient.get(`/sessions/tutors/${tutorId}/slots`, {
    params: { date },
  });
  return unwrap(response);
}

export async function bookTutorSessionRequest(payload) {
  const response = await apiClient.post("/sessions/bookings", payload);
  return unwrap(response);
}

export async function studentAcademiesRequest() {
  const response = await apiClient.get("/academies/list");
  return unwrap(response);
}

export async function academyCoursesRequest(academyId) {
  const response = await apiClient.get(`/academies/${academyId}/courses`);
  return unwrap(response);
}

export async function academyEnrollRequest(payload) {
  const response = await apiClient.post("/academies/enroll", payload);
  return unwrap(response);
}

export async function studentConfirmBookingRequest(bookingId, confirmed) {
  const response = await apiClient.post(`/sessions/bookings/${bookingId}/confirm`, {
    confirmed,
  });
  return unwrap(response);
}

export async function discoverTutorsRequest(params) {
  const response = await apiClient.get("/discovery/tutors", { params });
  return unwrap(response);
}

export async function discoverAcademiesRequest(params) {
  const response = await apiClient.get("/discovery/academies", { params });
  return unwrap(response);
}

export async function studentChatContactsRequest() {
  const response = await apiClient.get("/chat/contacts");
  return unwrap(response);
}

export async function studentConversationsRequest() {
  const response = await apiClient.get("/chat/conversations");
  return unwrap(response);
}

export async function studentThreadRequest(peerAccountId, params = {}) {
  const response = await apiClient.get(`/chat/messages/${peerAccountId}`, { params });
  return unwrap(response);
}

export async function studentSendMessageRequest(payload) {
  const response = await apiClient.post("/chat/messages", payload);
  return unwrap(response);
}

export async function studentReviewsRequest() {
  const response = await apiClient.get("/reviews/my");
  return unwrap(response);
}

export async function createStudentReviewRequest(payload) {
  const response = await apiClient.post("/reviews", payload);
  return unwrap(response);
}
