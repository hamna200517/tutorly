import { useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import { studentTopupRequest } from "../../api/student";
import useStudentStore from "../../store/studentStore";

export default function StudentWalletPage() {
  const [amount, setAmount] = useState("3000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [walletInfo, setWalletInfo] = useState(null);
  const walletBalance = useStudentStore((state) => state.walletBalance);
  const lastTopupAmount = useStudentStore((state) => state.lastTopupAmount);
  const storedWalletId = useStudentStore((state) => state.walletId);
  const setWalletSnapshot = useStudentStore((state) => state.setWalletSnapshot);

  const handleTopup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid positive top-up amount.");
      return;
    }

    setLoading(true);
    try {
      const data = await studentTopupRequest(numericAmount);
      setWalletInfo(data);
      setWalletSnapshot({
        walletId: data.wallet_id,
        walletBalance: data.balance_after,
        lastTopupAmount: data.topup_amount,
      });
      setSuccess(`Wallet topped up successfully by PKR ${data.topup_amount}.`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Student wallet top-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Top up your wallet to book sessions or enroll."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Wallet"
      quickStats={[
        {
          label: "Current Balance",
          value: walletInfo ? `PKR ${walletInfo.balance_after}` : walletBalance === null ? "Unavailable" : `PKR ${walletBalance}`,
          note: "Latest known balance",
        },
        {
          label: "Last Top-Up",
          value: walletInfo ? `PKR ${walletInfo.topup_amount}` : lastTopupAmount === null ? "PKR 0" : `PKR ${lastTopupAmount}`,
          note: "Most recent wallet load",
        },
        {
          label: "Wallet ID",
          value: walletInfo?.wallet_id || storedWalletId || "-",
          note: "Your student wallet reference",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Top Up Wallet</p>
          <h3>Fund your student account</h3>
          <p className="muted">
            Add balance to your wallet so you can book tutor sessions and enroll in academy courses without leaving
            the app.
          </p>

          <form onSubmit={handleTopup} className="form-grid" style={{ marginTop: "18px" }}>
            <div>
              <label htmlFor="amount">Top-up Amount (PKR)</label>
              <input
                id="amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Processing..." : "Top Up Wallet"}
            </button>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}
          </form>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Wallet Summary</p>
          <h3>Latest wallet activity</h3>
          {walletInfo ? (
            <div className="detail-list">
              <p>
                <strong>Wallet ID:</strong> {walletInfo.wallet_id}
              </p>
              <p>
                <strong>Balance before:</strong> PKR {walletInfo.balance_before}
              </p>
              <p>
                <strong>Balance after:</strong> PKR {walletInfo.balance_after}
              </p>
              <p>
                <strong>Currency:</strong> {walletInfo.currency}
              </p>
            </div>
          ) : (
            <p className="muted">
              Complete a top-up to view your latest wallet activity and balance summary.
            </p>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
