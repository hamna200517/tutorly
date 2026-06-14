import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { tutorNavItems } from "../../features/tutor/navigation";
import { tutorBookingsRequest, tutorReviewsRequest, tutorStatusRequest, tutorWithdrawalsRequest } from "../../api/tutor";

export default function TutorDashboard() {
  const [status, setStatus] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [reviewsSummary, setReviewsSummary] = useState({ average_rating: 0, total_reviews: 0 });

  useEffect(() => {
    async function loadData() {
      try {
        const [statusData, bookingsData, withdrawalsData, reviewsData] = await Promise.all([
          tutorStatusRequest(),
          tutorBookingsRequest(),
          tutorWithdrawalsRequest(),
          tutorReviewsRequest(),
        ]);

        setStatus(statusData);
        setBookings(bookingsData?.bookings || []);
        setWithdrawals(withdrawalsData?.withdrawals || withdrawalsData || []);
        setReviewsSummary(reviewsData?.rating_summary || { average_rating: 0, total_reviews: 0 });
      } catch {

      }
    }

    loadData();
  }, []);

  return (
    <RoleLayout
      roleTitle="Tutor"
      roleSubtitle="Your tutor overview."
      accentLabel="Tutor"
      navItems={tutorNavItems}
      quickStats={[
        { label: "Subscription", value: status?.active_subscription?.plan_type || "None", note: "Plan status and renewal" },
        {
          label: "Wallet",
          value: status?.wallet?.balance === undefined ? "Unavailable" : `PKR ${status?.wallet?.balance ?? 0}`,
          note: "Available balance for plans and payouts",
        },
        { label: "Withdrawals", value: String(withdrawals.length), note: "Track pending and reviewed requests" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Overview</p>
          <h3>Tutor control center</h3>
          <p className="muted">
            Manage your subscription, review bookings, request withdrawals, and keep an eye on student feedback.
          </p>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Quick Access</p>
          <h3>Current tutor activity</h3>
          <ul className="feature-list">
            <li>{bookings.length} booking(s) currently on your schedule</li>
            <li>{withdrawals.filter((item) => item.status === "pending").length} withdrawal request(s) pending</li>
            <li>{reviewsSummary.total_reviews} review(s) with average rating {reviewsSummary.average_rating || 0}</li>
            <li>Wallet top-up, subscription purchase, and student chat</li>
          </ul>
        </article>
      </div>
    </RoleLayout>
  );
}
