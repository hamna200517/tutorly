import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { tutorNavItems } from "../../features/tutor/navigation";
import { tutorReviewsRequest } from "../../api/tutor";

export default function TutorReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReviews() {
      setLoading(true);
      setError("");
      try {
        const data = await tutorReviewsRequest();
        setReviews(data?.reviews || []);
        setSummary(data?.rating_summary || { average_rating: 0, total_reviews: 0 });
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load tutor reviews.");
      } finally {
        setLoading(false);
      }
    }

    loadReviews();
  }, []);

  return (
    <RoleLayout
      roleTitle="Tutor"
      roleSubtitle="View your ratings and student feedback."
      accentLabel="Tutor"
      navItems={tutorNavItems}
      headerLabel="Reviews"
      quickStats={[
        { label: "Average Rating", value: loading ? "..." : String(summary.average_rating || 0), note: "Approved student ratings" },
        { label: "Total Reviews", value: loading ? "..." : String(summary.total_reviews || 0), note: "All approved reviews" },
        { label: "Visible Reviews", value: loading ? "..." : String(reviews.length), note: "Reviews currently listed" },
      ]}
    >
      <div className="soft-card">
        <p className="section-kicker">Feedback</p>
        <h3>Student reviews</h3>

        {loading ? <p className="muted">Loading reviews...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && reviews.length === 0 ? <p className="muted">No reviews yet.</p> : null}

        {!loading && reviews.length > 0 ? (
          <div className="booking-list">
            {reviews.map((review) => (
              <article key={review.review_id} className="booking-card">
                <div className="booking-row">
                  <strong>Review #{review.review_id}</strong>
                  <span className="booking-chip">Rating {review.rating}</span>
                </div>
                <p className="muted">Student: {review.student_name || "-"}</p>
                <p className="muted">Booking: #{review.booking_id}</p>
                <p>{review.comment || "No comment added."}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </RoleLayout>
  );
}
