import { NavLink, useNavigate } from "react-router-dom";
import { logoutRequest } from "../../api/auth";
import useAuthStore from "../../store/authStore";

export default function RoleLayout({
  roleTitle,
  roleSubtitle,
  accentLabel,
  navItems,
  quickStats,
  headerLabel = "Dashboard",
  headerStatus = "",
  children,
}) {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    try {
      await logoutRequest(refreshToken);
    } catch {

    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div>
          <div style={{fontWeight:800,fontSize:"20px",letterSpacing:"0.12em",color:"var(--primary)",marginBottom:"16px"}}>TUTORLY</div>
          <div className="badge-pill">{accentLabel}</div>
          <h1 className="dashboard-title">{roleTitle}</h1>
          <p className="muted">{roleSubtitle}</p>
        </div>

        <nav className="nav-list" aria-label={`${roleTitle} navigation`}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to || "#"}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive || item.active ? "active" : ""}`}
            >
              <span className="nav-item-label">{item.label}</span>
              <span className="nav-item-note">{item.note}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="muted" style={{ marginBottom: "8px" }}>
            Signed in as
          </p>
          <p className="sidebar-email">{user?.email || "-"}</p>
          <button className="btn-secondary" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="section-kicker">{headerLabel}</p>
            <h2 className="section-title">{roleTitle} Workspace</h2>
          </div>
          {headerStatus ? (
            <div className="header-card">
              <span className="header-dot" />
              <span>{headerStatus}</span>
            </div>
          ) : null}
        </header>

        <section className="stats-grid">
          {quickStats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-note">{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="content-panel">{children}</section>
      </section>
    </main>
  );
}
