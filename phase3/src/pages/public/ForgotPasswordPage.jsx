import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../../api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSuccess("If the email exists, reset instructions have been sent.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not start reset flow.");
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Enter your email first, then resend the reset email.");
      return;
    }

    setResending(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSuccess("Password reset email sent again.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not resend reset email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="page-wrap">
      <section className="card">
        <h1>Forgot Password</h1>
        <p className="muted">Enter your email to receive a password reset link.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset email"}
          </button>
          <button className="btn-secondary" type="button" disabled={resending} onClick={onResend}>
            {resending ? "Resending..." : "Resend reset email"}
          </button>
          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>

        <div className="row" style={{ marginTop: "14px" }}>
          <Link to="/reset-password">Already have recovery tokens?</Link>
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
