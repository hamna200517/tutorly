import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../../api/auth";

const initialForm = {
  email: "",
  password: "",
  role: "student",
  city: "",
  country: "",
  name: "",
  phone: "",
  education_level: "",
  teaching_mode: "online",
  academy_name: "",
  owner_name: "",
};

function getApiErrorMessage(err) {
  if (!err?.response) {
    return "Cannot reach backend API. Make sure backend is running on http://localhost:4001 and try again.";
  }

  const apiError = err.response?.data?.error;
  const message = apiError?.message || "Registration failed.";
  const details = Array.isArray(apiError?.details) ? apiError.details : [];
  return details.length ? `${message} ${details.join(" | ")}` : message;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = form.role;
  const isStudent = role === "student";
  const isTutor = role === "tutor";
  const isAcademy = role === "academy";

  const missingText = useMemo(() => {
    if (!form.email || !form.password || !form.city || !form.country) return "Please fill all required fields.";
    if ((isStudent || isTutor) && !form.name) return "Name is required for student or tutor.";
    if (isStudent && !form.phone) return "Phone is required for student.";
    if (isTutor && !form.education_level) return "Education level is required for tutor.";
    if (isAcademy && (!form.academy_name || !form.owner_name)) {
      return "Academy name and owner name are required for academy.";
    }
    return "";
  }, [form, isAcademy, isStudent, isTutor]);

  const passwordRuleText = useMemo(() => {
    if (!form.password) return "";

    const hasMin8 = form.password.length >= 8;
    const hasUpper = /[A-Z]/.test(form.password);
    const hasLower = /[a-z]/.test(form.password);
    const hasNumber = /\d/.test(form.password);
    const hasSymbol = /[^A-Za-z\d]/.test(form.password);

    if (hasMin8 && hasUpper && hasLower && hasNumber && hasSymbol) return "";
    return "Password must be 8+ chars and include uppercase, lowercase, number, and symbol.";
  }, [form.password]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (missingText) {
      setError(missingText);
      return;
    }

    if (passwordRuleText) {
      setError(passwordRuleText);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        city: form.city.trim(),
        country: form.country.trim(),
      };

      if (isStudent || isTutor) payload.name = form.name.trim();
      if (isStudent) payload.phone = form.phone.trim();
      if (isTutor) {
        payload.education_level = form.education_level.trim();
        payload.teaching_mode = form.teaching_mode;
      }
      if (isAcademy) {
        payload.academy_name = form.academy_name.trim();
        payload.owner_name = form.owner_name.trim();
      }

      await registerRequest(payload);
      setSuccess("Registration submitted. Please verify your email, then login.");
      window.setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-wrap">
      <section className="card">
        <h1>Create Account</h1>
        <p className="muted">Choose your role and fill in the details to create your account.</p>

        <form onSubmit={onSubmit} className="form-grid">
          <div>
            <label htmlFor="role">Role</label>
            <select id="role" name="role" value={form.role} onChange={onChange}>
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
              <option value="academy">Academy</option>
            </select>
          </div>

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
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Must include uppercase, lowercase, number, and symbol.
            </p>
          </div>

          <div className="row">
            <div style={{ flex: 1, minWidth: "180px" }}>
              <label htmlFor="city">City</label>
              <input id="city" name="city" value={form.city} onChange={onChange} required />
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <label htmlFor="country">Country</label>
              <input id="country" name="country" value={form.country} onChange={onChange} required />
            </div>
          </div>

          {(isStudent || isTutor) && (
            <div>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" value={form.name} onChange={onChange} required />
            </div>
          )}

          {isStudent && (
            <div>
              <label htmlFor="phone">Phone</label>
              <input id="phone" name="phone" value={form.phone} onChange={onChange} required />
            </div>
          )}

          {isTutor && (
            <>
              <div>
                <label htmlFor="education_level">Education Level</label>
                <input
                  id="education_level"
                  name="education_level"
                  value={form.education_level}
                  onChange={onChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="teaching_mode">Teaching Mode</label>
                <select id="teaching_mode" name="teaching_mode" value={form.teaching_mode} onChange={onChange}>
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </>
          )}

          {isAcademy && (
            <>
              <div>
                <label htmlFor="academy_name">Academy Name</label>
                <input
                  id="academy_name"
                  name="academy_name"
                  value={form.academy_name}
                  onChange={onChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="owner_name">Owner Name</label>
                <input
                  id="owner_name"
                  name="owner_name"
                  value={form.owner_name}
                  onChange={onChange}
                  required
                />
              </div>
            </>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </form>

        <div style={{ marginTop: "14px" }}>
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </section>
    </main>
  );
}
