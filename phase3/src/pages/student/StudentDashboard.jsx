import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import useStudentStore from "../../store/studentStore";

export default function StudentDashboard() {
  const walletBalance = useStudentStore((state) => state.walletBalance);
  const bookingCount = useStudentStore((state) => state.bookingCount);
  const enrollmentCount = useStudentStore((state) => state.enrollmentCount);

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Your student overview."
      accentLabel="Student"
      navItems={studentNavItems}
      quickStats={[
        { label: "Bookings", value: String(bookingCount), note: "Session count tracked across student pages" },
        { label: "Enrollments", value: String(enrollmentCount), note: "Academy course enrollments" },
        {
          label: "Wallet",
          value: walletBalance === null ? "Unavailable" : `PKR ${walletBalance}`,
          note: "Your latest known balance",
        },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Overview</p>
          <h3>Everything in one place</h3>
          <p className="muted">
            Use this dashboard to keep track of bookings, wallet activity, academy enrollments, and your learning
            activity at a glance.
          </p>
        </article>

        <article className="soft-card">
          <p className="section-kicker">Quick Access</p>
          <h3>What you can do here</h3>
          <ul className="feature-list">
            <li>Top up your wallet</li>
            <li>Book tutor sessions</li>
            <li>Enroll in academy courses</li>
            <li>Chat and leave reviews</li>
          </ul>
        </article>
      </div>
    </RoleLayout>
  );
}
