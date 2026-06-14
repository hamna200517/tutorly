import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <main className="page-wrap">
      <section className="card">
        <h1>Access Restricted</h1>
        <p className="muted">Your current role does not have permission to view this page.</p>
        <Link to="/login">Return to login</Link>
      </section>
    </main>
  );
}
