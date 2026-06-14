import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { tutorNavItems } from "../../features/tutor/navigation";
import { tutorRequestWithdrawalRequest, tutorStatusRequest, tutorWithdrawalsRequest } from "../../api/tutor";

export default function TutorWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [walletBalance, setWalletBalance] = useState(null);
  const [form, setForm] = useState({
    amount: "1000",
    provider: "bank_transfer",
    account_title: "",
    account_number: "",
    destination_note: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, withdrawalsData] = await Promise.all([tutorStatusRequest(), tutorWithdrawalsRequest()]);
      setWalletBalance(statusData?.wallet?.balance ?? null);
      setWithdrawals(withdrawalsData?.withdrawals || withdrawalsData || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load withdrawal data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const data = await tutorRequestWithdrawalRequest({
        amount: Number(form.amount),
        provider: form.provider,
        account_title: form.account_title,
        account_number: form.account_number,
        destination_note: form.destination_note,
      });
      setSuccess(data?.simulation?.message || "Withdrawal request submitted.");
      setForm((prev) => ({ ...prev, destination_note: "" }));
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not submit withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Tutor"
      roleSubtitle="Request and track your withdrawals."
      accentLabel="Tutor"
      navItems={tutorNavItems}
      headerLabel="Withdrawals"
      quickStats={[
        {
          label: "Wallet",
          value: walletBalance === null ? "Unavailable" : `PKR ${walletBalance}`,
          note: "Available tutor wallet balance",
        },
        {
          label: "Pending",
          value: loading ? "..." : String(withdrawals.filter((item) => item.status === "pending").length),
          note: "Requests awaiting admin review",
        },
        {
          label: "History",
          value: loading ? "..." : String(withdrawals.length),
          note: "All withdrawal requests",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Request Payout</p>
          <h3>Submit a withdrawal</h3>

          <form onSubmit={handleSubmit} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="withdrawAmount">Amount (PKR)</label>
              <input
                id="withdrawAmount"
                type="number"
                min="1"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="withdrawProvider">Provider</label>
              <select
                id="withdrawProvider"
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
              </select>
            </div>
            <div>
              <label htmlFor="withdrawTitle">Account Title</label>
              <input
                id="withdrawTitle"
                value={form.account_title}
                onChange={(e) => setForm((prev) => ({ ...prev, account_title: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="withdrawNumber">Account Number</label>
              <input
                id="withdrawNumber"
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="withdrawNote">Note</label>
              <textarea
                id="withdrawNote"
                rows={3}
                value={form.destination_note}
                onChange={(e) => setForm((prev) => ({ ...prev, destination_note: e.target.value }))}
                placeholder="Optional note for this payout"
              />
            </div>

            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Request Withdrawal"}
            </button>
          </form>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">History</p>
          <h3>Your withdrawal requests</h3>

          {loading ? <p className="muted">Loading withdrawals...</p> : null}
          {!loading && withdrawals.length === 0 ? <p className="muted">No withdrawal requests yet.</p> : null}

          {!loading && withdrawals.length > 0 ? (
            <div className="booking-list">
              {withdrawals.map((item) => (
                <article key={item.withdrawal_id} className="booking-card">
                  <div className="booking-row">
                    <strong>Withdrawal #{item.withdrawal_id}</strong>
                    <span className="booking-chip">{item.status}</span>
                  </div>
                  <p className="muted">Amount: PKR {item.amount}</p>
                  <p className="muted">Provider: {item.provider}</p>
                  <p className="muted">Requested: {new Date(item.requested_at).toLocaleString()}</p>
                  <p className="muted">Reference: {item.reference_code}</p>
                  {item.review_note ? <p className="muted">Review Note: {item.review_note}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </article>
      </div>
    </RoleLayout>
  );
}
