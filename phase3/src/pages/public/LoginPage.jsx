import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest, meRequest, resendVerificationRequest } from "../../api/auth";
import useAuthStore from "../../store/authStore";
import { getDashboardPathByRole } from "../../utils/roleRedirect";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setUserProfile = useAuthStore((state) => state.setUserProfile);

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const loginData = await loginRequest({
        email: form.email.trim(),
        password: form.password,
      });

      setSession({
        accessToken: loginData.access_token,
        refreshToken: loginData.refresh_token,
        user: { email: loginData.user?.email || form.email.trim() },
        role: "",
      });

      const meData = await meRequest();
      setUserProfile({
        user: {
          email: meData.email,
          account_id: meData.account_id,
          profile: meData.profile,
        },
        role: meData.role,
      });

      navigate(getDashboardPathByRole(meData.role), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!form.email.trim()) {
      setError("Enter your email first, then resend verification.");
      return;
    }

    setError("");
    setInfo("");
    setResending(true);

    try {
      const data = await resendVerificationRequest(form.email.trim());
      setInfo(data?.message || "Verification email sent.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="page-wrap">
      <section className="card">
        <h1>Welcome Back</h1>
        <p className="muted">Log in to continue into your Tutorly dashboard.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={onChange} required />
          </div>

          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <button className="btn-secondary" type="button" onClick={handleResendVerification} disabled={resending}>
            {resending ? "Sending verification..." : "Resend verification email"}
          </button>

          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="success">{info}</p> : null}
        </form>

        <div className="row" style={{ marginTop: "14px" }}>
          <Link to="/register">Create account</Link>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </section>
    </main>
  );
}
