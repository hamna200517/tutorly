import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { academyNavItems } from "../../features/academy/navigation";
import { academyEnrollmentsRequest, academyStatusRequest, academySubscriptionsRequest } from "../../api/academy";

export default function AcademyDashboard() {
  const [status, setStatus] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [statusData, enrollmentsData, subscriptionsData] = await Promise.all([
          academyStatusRequest(),
          academyEnrollmentsRequest(),
          academySubscriptionsRequest(),
        ]);
        setStatus(statusData);
        setEnrollments(enrollmentsData?.enrollments || []);
        setHistory(subscriptionsData?.subscriptions || []);
      } catch {

      }
    }

    loadData();
  }, []);

  return (
    <RoleLayout
      roleTitle="Academy"
      roleSubtitle="Your academy overview."
      accentLabel="Academy"
      navItems={academyNavItems}
      quickStats={[
        { label: "Subscription", value: status?.active_subscription?.plan_type || "None", note: "Monthly academy plan status" },
        {
          label: "Wallet",
          value: status?.wallet?.balance === undefined ? "Unavailable" : `PKR ${status?.wallet?.balance ?? 0}`,
          note: "Available balance for monthly renewal",
        },
        { label: "Enrollments", value: String(enrollments.length), note: "Students currently enrolled" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Overview</p>
          <h3>Academy operations at a glance</h3>
          <p className="muted">
            Oversee subscriptions, course activity, student enrollments, and conversations from one place.
          </p>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Quick Access</p>
          <h3>Current academy activity</h3>
          <ul className="feature-list">
            <li>{history.length} subscription record(s) available</li>
            <li>{enrollments.length} enrollment(s) currently tracked</li>
            <li>Seed starter courses and monitor student interest</li>
            <li>Respond to students through academy chat</li>
          </ul>
        </article>
      </div>
    </RoleLayout>
  );
}
