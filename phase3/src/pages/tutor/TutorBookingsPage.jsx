import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { tutorNavItems } from "../../features/tutor/navigation";
import { tutorBookingsRequest, tutorConfirmBookingRequest } from "../../api/tutor";

export default function TutorBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmingBookingId, setConfirmingBookingId] = useState(null);

  const loadBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await tutorBookingsRequest();
      setBookings(data?.bookings || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load tutor bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleConfirm = async (bookingId, confirmed) => {
    setConfirmingBookingId(bookingId);
    setError("");
    setSuccess("");
    try {
      const data = await tutorConfirmBookingRequest(bookingId, confirmed);
      setSuccess(data?.message || "Booking confirmation updated.");
      await loadBookings();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not confirm this booking.");
    } finally {
      setConfirmingBookingId(null);
    }
  };

  return (
    <RoleLayout
      roleTitle="Tutor"
      roleSubtitle="View and confirm student bookings."
      accentLabel="Tutor"
      navItems={tutorNavItems}
      headerLabel="Bookings"
      quickStats={[
        { label: "Total", value: loading ? "..." : String(bookings.length), note: "All tutor bookings" },
        {
          label: "Held",
          value: loading ? "..." : String(bookings.filter((item) => item.escrow_status === "held").length),
          note: "Sessions still awaiting release or refund",
        },
        {
          label: "Completed",
          value: loading ? "..." : String(bookings.filter((item) => item.booking_status === "completed").length),
          note: "Finished sessions",
        },
      ]}
    >
      <div className="soft-card">
        <p className="section-kicker">Sessions</p>
        <h3>Bookings and confirmations</h3>

        {loading ? <p className="muted">Loading bookings...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}

        {!loading && bookings.length === 0 ? <p className="muted">No tutor bookings yet.</p> : null}

        {!loading && bookings.length > 0 ? (
          <div className="booking-list">
            {bookings.map((booking) => (
              <article key={booking.booking_id} className="booking-card">
                <div className="booking-row">
                  <strong>Booking #{booking.booking_id}</strong>
                  <span className="booking-chip">{booking.booking_status}</span>
                </div>
                <p className="muted">Student: {booking.student_name || "-"}</p>
                <p className="muted">Student Email: {booking.student_email || "-"}</p>
                <p className="muted">Session: {new Date(booking.session_datetime).toLocaleString()}</p>
                <p className="muted">Escrow: {booking.escrow_status}</p>
                <p className="muted">Confirmation: {booking.confirmation_status}</p>
                <p className="muted">Amount: PKR {booking.amount_total}</p>

                {booking.escrow_status === "held" ? (
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
                  <p className="muted">This session no longer needs tutor confirmation.</p>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </RoleLayout>
  );
}
