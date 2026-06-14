import { useEffect, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { academyNavItems } from "../../features/academy/navigation";
import { academyEnrollmentsRequest } from "../../api/academy";

export default function AcademyEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEnrollments() {
      setLoading(true);
      setError("");
      try {
        const data = await academyEnrollmentsRequest();
        setEnrollments(data?.enrollments || []);
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load academy enrollments.");
      } finally {
        setLoading(false);
      }
    }

    loadEnrollments();
  }, []);

  return (
    <RoleLayout
      roleTitle="Academy"
      roleSubtitle="View student enrollments."
      accentLabel="Academy"
      navItems={academyNavItems}
      headerLabel="Enrollments"
      quickStats={[
        { label: "Total", value: loading ? "..." : String(enrollments.length), note: "All academy enrollments" },
        {
          label: "Enrolled",
          value: loading ? "..." : String(enrollments.filter((item) => item.status === "enrolled").length),
          note: "Students currently enrolled",
        },
        {
          label: "Courses",
          value: loading ? "..." : String(new Set(enrollments.map((item) => item.course_id)).size),
          note: "Courses with enrollment activity",
        },
      ]}
    >
      <div className="soft-card">
        <p className="section-kicker">Enrollment List</p>
        <h3>Students in your academy</h3>

        {loading ? <p className="muted">Loading enrollments...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && enrollments.length === 0 ? <p className="muted">No student enrollments yet.</p> : null}

        {!loading && enrollments.length > 0 ? (
          <div className="booking-list">
            {enrollments.map((item) => (
              <article key={item.enrollment_id} className="booking-card">
                <div className="booking-row">
                  <strong>Enrollment #{item.enrollment_id}</strong>
                  <span className="booking-chip">{item.status}</span>
                </div>
                <p className="muted">Student: {item.student_name || "-"}</p>
                <p className="muted">Student Email: {item.student_email || "-"}</p>
                <p className="muted">Course: {item.course_title}</p>
                <p className="muted">Subject: {item.subject_name}</p>
                <p className="muted">Paid: PKR {item.amount_paid}</p>
                <p className="muted">Enrolled At: {new Date(item.enrolled_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </RoleLayout>
  );
}
