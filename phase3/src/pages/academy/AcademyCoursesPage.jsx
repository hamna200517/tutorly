import { useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { academyNavItems } from "../../features/academy/navigation";
import { academySeedCoursesRequest } from "../../api/academy";

export default function AcademyCoursesPage() {
  const [seedResult, setSeedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSeed = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const data = await academySeedCoursesRequest();
      setSeedResult(data);
      setSuccess(data?.message || "Courses updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not seed academy courses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Academy"
      roleSubtitle="Add and manage your courses."
      accentLabel="Academy"
      navItems={academyNavItems}
      headerLabel="Courses"
      quickStats={[
        { label: "Starter Pack", value: "10", note: "Starter courses available" },
        { label: "Action", value: loading ? "..." : "Ready", note: "Seed course catalog on demand" },
        { label: "Latest Seed", value: seedResult?.inserted ?? "-", note: "Courses inserted in the last action" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Seed Courses</p>
          <h3>Generate your starter catalog</h3>
          <p className="muted">
            Generate a starter course set across common subjects for your academy.
          </p>

          <button className="btn-primary" type="button" disabled={loading} onClick={handleSeed} style={{ marginTop: "16px" }}>
            {loading ? "Generating..." : "Generate Starter Courses"}
          </button>

          {error ? <p className="error">{error}</p> : null}
          {success ? <p className="success">{success}</p> : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Latest Result</p>
          <h3>Course seeding summary</h3>
          {seedResult ? (
            <div className="detail-list">
              <p>
                <strong>Inserted:</strong> {seedResult.inserted}
              </p>
              <p>
                <strong>Message:</strong> {seedResult.message}
              </p>
            </div>
          ) : (
            <p className="muted">Generate starter courses to see results here.</p>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
