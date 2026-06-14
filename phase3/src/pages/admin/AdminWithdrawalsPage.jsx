import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { adminNavItems } from "../../features/admin/navigation";
import { adminPendingWithdrawalsRequest, adminReviewWithdrawalRequest } from "../../api/admin";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWithdrawals = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminPendingWithdrawalsRequest();
      setWithdrawals(data?.withdrawals || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load pending withdrawals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const handleReview = async (withdrawalId, decision) => {
    setReviewingId(withdrawalId);
    setError("");
    setSuccess("");
    try {
      const data = await adminReviewWithdrawalRequest(withdrawalId, {
        decision,
        review_note: reviewNotes[withdrawalId] || "",
      });
      setSuccess(data?.action ? `Withdrawal ${data.action.replaceAll("_", " ")}.` : "Withdrawal reviewed successfully.");
      await loadWithdrawals();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not review this withdrawal.");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <RoleLayout
      roleTitle="Admin"
      roleSubtitle="Review and action pending tutor withdrawals."
      accentLabel="Admin"
      navItems={adminNavItems}
      headerLabel="Withdrawals"
      quickStats={[
        { label: "Pending", value: loading ? "..." : String(withdrawals.length), note: "Requests waiting for a decision" },
        {
          label: "Oldest Queue Item",
          value: loading || withdrawals.length === 0 ? "-" : new Date(withdrawals[0].requested_at).toLocaleDateString(),
          note: "Earliest pending request",
        },
        { label: "Review Mode", value: "Live", note: "Decisions update the backend immediately" },
      ]}
    >
      <div className="soft-card">
        <p className="section-kicker">Pending Queue</p>
        <h3>Withdrawal requests awaiting review</h3>

        {loading ? <p className="muted">Loading pending withdrawals...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
        {!loading && withdrawals.length === 0 ? <p className="muted">No pending withdrawals right now.</p> : null}

        {!loading && withdrawals.length > 0 ? (
          <div className="booking-list">
            {withdrawals.map((item) => (
              <article key={item.withdrawal_id} className="booking-card">
                <div className="booking-row">
                  <strong>Withdrawal #{item.withdrawal_id}</strong>
                  <span className="booking-chip">{item.status}</span>
                </div>
                <p className="muted">Tutor Email: {item.tutor_email}</p>
                <p className="muted">Amount: PKR {item.amount}</p>
                <p className="muted">Provider: {item.provider}</p>
                <p className="muted">Account Title: {item.account_title}</p>
                <p className="muted">Account Number: {item.account_number}</p>
                <p className="muted">Requested At: {new Date(item.requested_at).toLocaleString()}</p>
                {item.destination_note ? <p className="muted">Destination Note: {item.destination_note}</p> : null}
                <p className="muted">Reference: {item.reference_code}</p>

                <div className="form-grid" style={{ marginTop: "14px" }}>
                  <div>
                    <label htmlFor={`review-note-${item.withdrawal_id}`}>Review Note</label>
                    <textarea
                      id={`review-note-${item.withdrawal_id}`}
                      rows={3}
                      value={reviewNotes[item.withdrawal_id] || ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({
                          ...prev,
                          [item.withdrawal_id]: e.target.value,
                        }))
                      }
                      placeholder="Optional note for this decision"
                    />
                  </div>

                  <div className="action-row">
                    <button
                      className="btn-primary"
                      type="button"
                      disabled={reviewingId === item.withdrawal_id}
                      onClick={() => handleReview(item.withdrawal_id, "approved")}
                    >
                      {reviewingId === item.withdrawal_id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={reviewingId === item.withdrawal_id}
                      onClick={() => handleReview(item.withdrawal_id, "rejected")}
                    >
                      {reviewingId === item.withdrawal_id ? "Processing..." : "Reject"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </RoleLayout>
  );
}
