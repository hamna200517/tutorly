import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import { createStudentReviewRequest, studentBookingsRequest, studentReviewsRequest } from "../../api/student";

export default function StudentReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [reviewsData, bookingsData] = await Promise.all([
          studentReviewsRequest(),
          studentBookingsRequest(),
        ]);

        setReviews(reviewsData || []);
        const eligibleBookings = (bookingsData?.bookings || []).filter(
          (booking) => booking.booking_type === "tutor"
        );
        setBookings(eligibleBookings);
        if (eligibleBookings[0]) {
          setBookingId(String(eligibleBookings[0].booking_id));
        }
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load reviews.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      setError("Choose an eligible completed booking first.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await createStudentReviewRequest({
        booking_id: Number(bookingId),
        rating: Number(rating),
        comment: comment.trim(),
      });
      setSuccess("Review submitted successfully.");
      setComment("");
      const refreshedReviews = await studentReviewsRequest();
      setReviews(refreshedReviews || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Leave feedback for completed sessions."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Reviews"
      quickStats={[
        { label: "Eligible Sessions", value: loading ? "..." : String(bookings.length), note: "Sessions you can review now" },
        { label: "Review Limit", value: "1 / Booking", note: "One review per session" },
        { label: "My Reviews", value: loading ? "..." : String(reviews.length), note: "Reviews you have submitted" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Submit Review</p>
          <h3>Rate an eligible tutor session</h3>

          {loading ? <p className="muted">Loading eligible bookings...</p> : null}
          {error ? <p className="error">{error}</p> : null}

          <form onSubmit={handleSubmit} className="form-grid">
            <div>
              <label htmlFor="reviewBookingId">Eligible Booking</label>
              <select
                id="reviewBookingId"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                disabled={!bookings.length}
              >
                <option value="">Select booking</option>
                {bookings.map((booking) => (
                  <option key={booking.booking_id} value={booking.booking_id}>
                    #{booking.booking_id} - {booking.tutor_name || "Tutor"} - {booking.confirmation_status || booking.booking_status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rating">Rating</label>
              <select id="rating" value={rating} onChange={(e) => setRating(e.target.value)}>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>

            <div>
              <label htmlFor="comment">Comment</label>
              <textarea
                id="comment"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share what went well in the session..."
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting || !bookingId}>
              {submitting ? "Submitting..." : "Submit Review"}
            </button>

            {success ? <p className="success">{success}</p> : null}
          </form>
        </article>

        <article className="soft-card">
          <p className="section-kicker">My Reviews</p>
          <h3>Submitted student feedback</h3>

          {reviews.length === 0 ? (
            <p className="muted">No reviews submitted yet.</p>
          ) : (
            <div className="booking-list">
              {reviews.map((review) => (
                <article key={review.review_id} className="booking-card">
                  <div className="booking-row">
                    <strong>Review #{review.review_id}</strong>
                    <span className="booking-chip">Rating {review.rating}</span>
                  </div>
                  <p className="muted">Tutor: {review.tutor_name || "-"}</p>
                  <p className="muted">Booking: #{review.booking_id}</p>
                  <p>{review.comment || "No comment added."}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
