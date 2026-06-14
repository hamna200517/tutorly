import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import { studentBookingsRequest, studentConfirmBookingRequest } from "../../api/student";
import useStudentStore from "../../store/studentStore";

export default function StudentBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [confirmingBookingId, setConfirmingBookingId] = useState(null);
  const setBookingCount = useStudentStore((state) => state.setBookingCount);

  async function loadBookings(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const data = await studentBookingsRequest();
      const bookingList = data?.bookings || [];
      setBookings(bookingList);
      setBookingCount(bookingList.length);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load student bookings.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, [setBookingCount]);

  const handleConfirm = async (bookingId, confirmed) => {
    setConfirmingBookingId(bookingId);
    setActionMessage("");
    setError("");

    try {
      const result = await studentConfirmBookingRequest(bookingId, confirmed);
      setActionMessage(result?.message || "Booking confirmation updated.");
      await loadBookings(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not confirm this booking.");
    } finally {
      setConfirmingBookingId(null);
    }
  };

  const canStudentConfirm = (booking) => {
    return booking.escrow_status === "held";
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="View and manage your bookings."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Bookings"
      quickStats={[
        {
          label: "Total",
          value: loading ? "..." : String(bookings.length),
          note: "All tutor sessions on your account",
        },
        {
          label: "Held",
          value: loading ? "..." : String(bookings.filter((booking) => booking.escrow_status === "held").length),
          note: "Payments still in escrow",
        },
        {
          label: "Completed",
          value:
            loading ? "..." : String(bookings.filter((booking) => booking.booking_status === "completed").length),
          note: "Finished sessions",
        },
      ]}
    >
      <div className="soft-card">
        <p className="section-kicker">Escrow Flow</p>
        <h3>Bookings and confirmations</h3>

        {loading ? <p className="muted">Loading bookings...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {actionMessage ? <p className="success">{actionMessage}</p> : null}

        {!loading && !error && bookings.length === 0 ? (
          <p className="muted">No bookings yet. Go to Tutors and make your first booking.</p>
        ) : null}

        {!loading && bookings.length > 0 ? (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article key={booking.booking_id} className="booking-card">
                <div className="booking-row">
                  <strong>Booking #{booking.booking_id}</strong>
                  <span className="booking-chip">{booking.booking_status}</span>
                </div>
                <p className="muted">Tutor: {booking.tutor_name || "-"}</p>
                <p className="muted">Session: {new Date(booking.session_datetime).toLocaleString()}</p>
                <p className="muted">Escrow: {booking.escrow_status}</p>
                <p className="muted">Confirmation: {booking.confirmation_status}</p>
                <p className="muted">Amount: PKR {booking.amount_total}</p>
                {canStudentConfirm(booking) ? (
                  <div className="action-row">
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={confirmingBookingId === booking.booking_id}
                      onClick={() => handleConfirm(booking.booking_id, true)}
                    >
                      {confirmingBookingId === booking.booking_id ? "Processing..." : "Confirm YES"}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={confirmingBookingId === booking.booking_id}
                      onClick={() => handleConfirm(booking.booking_id, false)}
                    >
                      {confirmingBookingId === booking.booking_id ? "Processing..." : "Confirm NO"}
                    </button>
                  </div>
                ) : (
                  <p className="muted">No action is needed for this booking right now.</p>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </RoleLayout>
  );
}
