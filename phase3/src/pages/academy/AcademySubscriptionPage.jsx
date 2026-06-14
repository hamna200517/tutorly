import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { academyNavItems } from "../../features/academy/navigation";
import {
  academyPurchaseSubscriptionRequest,
  academyStatusRequest,
  academySubscriptionsRequest,
  academyTopupRequest,
} from "../../api/academy";

export default function AcademySubscriptionPage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [topupAmount, setTopupAmount] = useState("20000");
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, historyData] = await Promise.all([academyStatusRequest(), academySubscriptionsRequest()]);
      setStatus(statusData);
      setHistory(historyData?.subscriptions || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load academy subscription data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid positive top-up amount.");
      return;
    }

    setTopupLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await academyTopupRequest(amount);
      setSuccess(`Wallet topped up successfully by PKR ${data.topup_amount}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not top up academy wallet.");
    } finally {
      setTopupLoading(false);
    }
  };

  const handlePurchase = async () => {
    setPurchaseLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await academyPurchaseSubscriptionRequest();
      setSuccess(`Monthly subscription purchased successfully. Plan: ${data.subscription?.plan_type || "1m"}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not purchase academy subscription.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const walletBalance = status?.wallet?.balance;
  const activePlan = status?.active_subscription;
  const monthlyPrice = status?.pricing?.monthly_price || 20000;

  return (
    <RoleLayout
      roleTitle="Academy"
      roleSubtitle="Manage your subscription and wallet."
      accentLabel="Academy"
      navItems={academyNavItems}
      headerLabel="Subscription"
      quickStats={[
        {
          label: "Wallet",
          value: walletBalance === undefined || walletBalance === null ? "Unavailable" : `PKR ${walletBalance}`,
          note: "Current academy wallet balance",
        },
        {
          label: "Active Plan",
          value: activePlan?.plan_type || "None",
          note: activePlan
            ? `Expires: ${new Date(activePlan.end_at || activePlan.end_date).toLocaleDateString()}`
            : "Buy a plan to appear in student search",
        },
        {
          label: "Monthly Fee",
          value: `PKR ${monthlyPrice}`,
          note: "Fixed academy subscription price",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Wallet</p>
          <h3>Top up before renewing</h3>

          <form onSubmit={handleTopup} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="academyTopupAmount">Top-up Amount (PKR)</label>
              <input
                id="academyTopupAmount"
                type="number"
                min="1"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={topupLoading}>
              {topupLoading ? "Processing..." : "Top Up Wallet"}
            </button>
          </form>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Monthly Plan</p>
          <h3>Activate your academy subscription</h3>
          <p className="muted">Keep your academy visible to students and continue offering enrollments each month.</p>

          <div className="detail-list" style={{ marginTop: "16px" }}>
            <p>
              <strong>Price:</strong> PKR {monthlyPrice}
            </p>
            <p>
              <strong>Next action:</strong> {status?.next_action || "none"}
            </p>
          </div>

          <button
            className="btn-secondary"
            type="button"
            disabled={Boolean(activePlan) || purchaseLoading}
            onClick={handlePurchase}
            style={{ marginTop: "16px" }}
          >
            {purchaseLoading ? "Purchasing..." : "Purchase Monthly Plan"}
          </button>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Current Status</p>
          <h3>Your subscription summary</h3>
          {loading ? (
            <p className="muted">Loading status...</p>
          ) : activePlan ? (
            <div className="detail-list">
              <p>
                <strong>Plan:</strong> {activePlan.plan_type}
              </p>
              <p>
                <strong>Start:</strong> {new Date(activePlan.start_at || activePlan.start_date).toLocaleString()}
              </p>
              <p>
                <strong>End:</strong> {new Date(activePlan.end_at || activePlan.end_date).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="muted">No active subscription yet.</p>
          )}
        </article>

        <article className="soft-card">
          <p className="section-kicker">History</p>
          <h3>Subscription record</h3>
          {loading ? (
            <p className="muted">Loading subscription history...</p>
          ) : history.length === 0 ? (
            <p className="muted">No subscriptions yet.</p>
          ) : (
            <div className="booking-list">
              {history.map((item) => (
                <article key={item.subscription_id} className="booking-card">
                  <div className="booking-row">
                    <strong>{item.plan_type}</strong>
                    <span className="booking-chip">{item.is_active ? "active" : "ended"}</span>
                  </div>
                  <p className="muted">Start: {new Date(item.start_at || item.start_date).toLocaleString()}</p>
                  <p className="muted">End: {new Date(item.end_at || item.end_date).toLocaleString()}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
