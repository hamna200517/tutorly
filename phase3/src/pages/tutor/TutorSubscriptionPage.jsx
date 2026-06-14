import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { tutorNavItems } from "../../features/tutor/navigation";
import {
  tutorPurchasePlanRequest,
  tutorStatusRequest,
  tutorSubscriptionsRequest,
  tutorTopupRequest,
} from "../../api/tutor";

export default function TutorSubscriptionPage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [topupAmount, setTopupAmount] = useState("3000");
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, historyData] = await Promise.all([tutorStatusRequest(), tutorSubscriptionsRequest()]);
      setStatus(statusData);
      setHistory(historyData?.subscriptions || []);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load tutor subscription data.");
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
      const data = await tutorTopupRequest(amount);
      setSuccess(`Wallet topped up successfully by PKR ${data.topup_amount}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not top up tutor wallet.");
    } finally {
      setTopupLoading(false);
    }
  };

  const handlePurchase = async (planType) => {
    setPurchaseLoading(planType);
    setError("");
    setSuccess("");
    try {
      const data = await tutorPurchasePlanRequest(planType);
      setSuccess(`Subscription purchased successfully. Plan: ${data.subscription?.plan_type || planType}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not purchase subscription plan.");
    } finally {
      setPurchaseLoading("");
    }
  };

  const walletBalance = status?.wallet?.balance;
  const plans = status?.plans || [];
  const activePlan = status?.active_subscription;

  return (
    <RoleLayout
      roleTitle="Tutor"
      roleSubtitle="Manage your subscription and wallet."
      accentLabel="Tutor"
      navItems={tutorNavItems}
      headerLabel="Subscription"
      quickStats={[
        {
          label: "Wallet",
          value: walletBalance === undefined || walletBalance === null ? "Unavailable" : `PKR ${walletBalance}`,
          note: "Current tutor wallet balance",
        },
        {
          label: "Active Plan",
          value: activePlan?.plan_type || "None",
          note: activePlan
            ? `Expires: ${new Date(activePlan.end_at || activePlan.end_date).toLocaleDateString()}`
            : "Buy a plan to appear in student search",
        },
        {
          label: "History",
          value: loading ? "..." : String(history.length),
          note: "Past and current subscriptions",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Wallet</p>
          <h3>Top up before purchasing a plan</h3>

          <form onSubmit={handleTopup} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="tutorTopupAmount">Top-up Amount (PKR)</label>
              <input
                id="tutorTopupAmount"
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
          <p className="section-kicker">Plans</p>
          <h3>Choose your subscription</h3>

          {loading ? <p className="muted">Loading plans...</p> : null}

          {!loading ? (
            <div className="booking-list">
              {plans.map((plan) => (
                <article key={plan.plan_type} className="booking-card">
                  <div className="booking-row">
                    <strong>{plan.duration_label}</strong>
                    <span className="booking-chip">PKR {plan.price}</span>
                  </div>
                  <ul className="feature-list">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={Boolean(activePlan) || purchaseLoading === plan.plan_type}
                    onClick={() => handlePurchase(plan.plan_type)}
                    style={{ marginTop: "14px" }}
                  >
                    {purchaseLoading === plan.plan_type ? "Purchasing..." : "Purchase Plan"}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
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
            <p className="muted">No active plan yet. Top up your wallet and choose one of the available options.</p>
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
