import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { resetPasswordRequest } from "../../api/auth";

function getResetErrorMessage(err) {
  if (!err?.response) {
    return "Cannot reach backend API. Make sure backend is running on http://localhost:4001 and try again.";
  }

  const apiError = err.response?.data?.error;
  const message = apiError?.message || "Reset password failed.";
  const details = Array.isArray(apiError?.details) ? apiError.details : [];
  return details.length ? `${message} ${details.join(" | ")}` : message;
}

export default function ResetPasswordPage() {
  const [form, setForm] = useState({
    access_token: "",
    refresh_token: "",
    new_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search);

    const accessToken =
      hashParams.get("access_token") || queryParams.get("access_token") || queryParams.get("token") || "";
    const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token") || "";

    if (accessToken || refreshToken) {
      setForm((prev) => ({
        ...prev,
        access_token: accessToken || prev.access_token,
        refresh_token: refreshToken || prev.refresh_token,
      }));
    }
  }, []);

  const passwordRuleText = useMemo(() => {
    if (!form.new_password) return "";

    const hasMin8 = form.new_password.length >= 8;
    const hasUpper = /[A-Z]/.test(form.new_password);
    const hasLower = /[a-z]/.test(form.new_password);
    const hasNumber = /\d/.test(form.new_password);
    const hasSymbol = /[^A-Za-z\d]/.test(form.new_password);

    if (hasMin8 && hasUpper && hasLower && hasNumber && hasSymbol) return "";
    return "Password must be 8+ chars and include uppercase, lowercase, number, and symbol.";
  }, [form.new_password]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (passwordRuleText) {
        throw new Error(passwordRuleText);
      }

      await resetPasswordRequest({
        access_token: form.access_token.trim(),
        refresh_token: form.refresh_token.trim(),
        new_password: form.new_password,
      });
      setSuccess("Password reset successful. Please login again.");
      setForm({
        access_token: "",
        refresh_token: "",
        new_password: "",
      });
    } catch (err) {
      setError(err.message === passwordRuleText ? passwordRuleText : getResetErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-wrap">
      <section className="card">
        <h1>Reset Password</h1>
        <p className="muted">Enter your new password. The reset link from your email will auto-fill the required fields.</p>
        <p className="muted" style={{ marginTop: "0" }}>
          If the fields are empty, your reset link may have expired. Request a new one from forgot password.
        </p>

        <form onSubmit={onSubmit} className="form-grid">
          <div>
            <label htmlFor="access_token">Access Token</label>
            <textarea
              id="access_token"
              name="access_token"
              rows={3}
              value={form.access_token}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="refresh_token">Refresh Token</label>
            <textarea
              id="refresh_token"
              name="refresh_token"
              rows={3}
              value={form.refresh_token}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <label htmlFor="new_password">New Password</label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              value={form.new_password}
              onChange={onChange}
              required
            />
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Must include uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Reset password"}
          </button>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>

        <div style={{ marginTop: "14px" }}>
          <Link to="/login">Back to login</Link>
        </div>
      </section>
    </main>
  );
}
