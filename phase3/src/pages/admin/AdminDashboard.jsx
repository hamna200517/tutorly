import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { adminNavItems } from "../../features/admin/navigation";
import { adminPendingWithdrawalsRequest } from "../../api/admin";

export default function AdminDashboard() {
  const [withdrawals, setWithdrawals] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await adminPendingWithdrawalsRequest();
        setWithdrawals(data?.withdrawals || []);
      } catch {

      }
    }

    loadData();
  }, []);

  const pendingCount = withdrawals.length;

  return (
    <RoleLayout
      roleTitle="Admin"
      roleSubtitle="Manage withdrawal requests and platform activity."
      accentLabel="Admin"
      navItems={adminNavItems}
      quickStats={[
        { label: "Pending", value: String(pendingCount), note: "Withdrawal requests awaiting review" },
        {
          label: "Queue Health",
          value: pendingCount > 0 ? "Action Needed" : "Clear",
          note: "Current payout review workload",
        },
        {
          label: "Focus",
          value: "Withdrawals",
          note: "Main admin flow available in this phase",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Overview</p>
          <h3>Admin review center</h3>
          <p className="muted">
            Review withdrawal requests, resolve payment decisions, and keep money-sensitive activity under control.
          </p>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Quick Access</p>
          <h3>What needs attention</h3>
          <ul className="feature-list">
            <li>{pendingCount} withdrawal request(s) are waiting for review</li>
            <li>Approve requests that should move forward</li>
            <li>Reject requests that should refund the tutor wallet</li>
          </ul>
        </article>
      </div>
    </RoleLayout>
  );
}
