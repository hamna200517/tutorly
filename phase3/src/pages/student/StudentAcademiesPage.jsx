import { useEffect, useMemo, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import {
  academyCoursesRequest,
  academyEnrollRequest,
  discoverAcademiesRequest,
  studentAcademiesRequest,
  studentEnrollmentsRequest,
} from "../../api/student";
import useStudentStore from "../../store/studentStore";

export default function StudentAcademiesPage() {
  const subjectOptions = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Other"];
  const locationOptions = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Other"];
  const [academies, setAcademies] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingAcademies, setLoadingAcademies] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedAcademyId, setSelectedAcademyId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [filters, setFilters] = useState({
    subjectPreset: "",
    subjectOther: "",
    locationPreset: "",
    locationOther: "",
    min_rating: "",
    min_price: "",
    max_price: "",
  });
  const applyEnrollmentResult = useStudentStore((state) => state.applyEnrollmentResult);
  const setEnrollmentCount = useStudentStore((state) => state.setEnrollmentCount);

  useEffect(() => {
    async function loadAcademies() {
      setLoadingAcademies(true);
      setError("");
      try {
        const data = await studentAcademiesRequest();
        const academyList = data?.academies || [];
        setAcademies(academyList);
        if (academyList[0]) {
          setSelectedAcademyId(String(academyList[0].academy_id));
        }
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load academies.");
      } finally {
        setLoadingAcademies(false);
      }
    }

    loadAcademies();
  }, []);

  useEffect(() => {
    async function loadEnrollmentCount() {
      try {
        const data = await studentEnrollmentsRequest();
        setEnrollmentCount((data?.enrollments || []).length);
      } catch {

      }
    }

    loadEnrollmentCount();
  }, [setEnrollmentCount]);

  const selectedAcademy = useMemo(
    () => academies.find((academy) => String(academy.academy_id) === String(selectedAcademyId)),
    [academies, selectedAcademyId]
  );
  const subjectValue =
    filters.subjectPreset === "Other" ? filters.subjectOther.trim() : filters.subjectPreset.trim();
  const locationValue =
    filters.locationPreset === "Other" ? filters.locationOther.trim() : filters.locationPreset.trim();

  const runDiscovery = async () => {
    setLoadingAcademies(true);
    setError("");
    try {
      const query = {
        limit: 20,
        offset: 0,
      };

      const preparedFilters = {
        subject: subjectValue,
        location: locationValue,
        min_rating: filters.min_rating,
        min_price: filters.min_price,
        max_price: filters.max_price,
      };

      Object.entries(preparedFilters).forEach(([key, value]) => {
        if (value !== "") query[key] = value;
      });

      const data = await discoverAcademiesRequest(query);
      const academyList = data?.academies || [];
      setAcademies(academyList);
      setSelectedAcademyId(academyList[0] ? String(academyList[0].academy_id) : "");
      setCourses([]);
      setSelectedCourseId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Academy search failed.");
    } finally {
      setLoadingAcademies(false);
    }
  };

  const loadCourses = async () => {
    if (!selectedAcademyId) {
      setError("Choose an academy first.");
      return;
    }

    setLoadingCourses(true);
    setError("");
    setSuccess("");
    try {
      const data = await academyCoursesRequest(selectedAcademyId);
      setCourses(data?.courses || []);
      setSelectedCourseId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load academy courses.");
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedAcademyId || !selectedCourseId) {
      setError("Choose an academy and a course before enrolling.");
      return;
    }

    setEnrolling(true);
    setError("");
    setSuccess("");

    try {
      const data = await academyEnrollRequest({
        academy_id: Number(selectedAcademyId),
        course_id: Number(selectedCourseId),
      });
      setEnrollmentResult(data);
      applyEnrollmentResult({
        walletBalance: data.student_wallet?.balance_after,
      });
      setSuccess("Enrollment successful. Payment has been completed from your student wallet.");
      setSelectedCourseId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Enrollment failed.");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Find academies and enroll in courses."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Academies"
      quickStats={[
        {
          label: "Search Focus",
          value: subjectValue || locationValue || "All academies",
          note: "Current search focus",
        },
        {
          label: "Academies",
          value: loadingAcademies ? "..." : String(academies.length),
          note: "Academies matching your search",
        },
        { label: "Course Fee", value: "PKR 1000", note: "A common starting fee" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Discover Academies</p>
          <h3>Active academies available to students</h3>

          <div className="form-grid" style={{ marginTop: "16px" }}>
            <div className="row">
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label htmlFor="academySubjectFilter">Subject</label>
                <select
                  id="academySubjectFilter"
                  value={filters.subjectPreset}
                  onChange={(e) => setFilters((prev) => ({ ...prev, subjectPreset: e.target.value }))}
                >
                  <option value="">Any Subject</option>
                  {subjectOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label htmlFor="academyLocationFilter">Location</label>
                <select
                  id="academyLocationFilter"
                  value={filters.locationPreset}
                  onChange={(e) => setFilters((prev) => ({ ...prev, locationPreset: e.target.value }))}
                >
                  <option value="">Any Location</option>
                  {locationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filters.subjectPreset === "Other" ? (
              <div>
                <label htmlFor="academySubjectOther">Other Subject</label>
                <input
                  id="academySubjectOther"
                  value={filters.subjectOther}
                  onChange={(e) => setFilters((prev) => ({ ...prev, subjectOther: e.target.value }))}
                  placeholder="Type a custom subject"
                />
              </div>
            ) : null}

            {filters.locationPreset === "Other" ? (
              <div>
                <label htmlFor="academyLocationOther">Other Location</label>
                <input
                  id="academyLocationOther"
                  value={filters.locationOther}
                  onChange={(e) => setFilters((prev) => ({ ...prev, locationOther: e.target.value }))}
                  placeholder="Type a custom city or country"
                />
              </div>
            ) : null}

            <div className="row">
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="academyRatingFilter">Min Rating</label>
                <input
                  id="academyRatingFilter"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filters.min_rating}
                  onChange={(e) => setFilters((prev) => ({ ...prev, min_rating: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="academyMinPriceFilter">Min Price</label>
                <input
                  id="academyMinPriceFilter"
                  type="number"
                  min="0"
                  value={filters.min_price}
                  onChange={(e) => setFilters((prev) => ({ ...prev, min_price: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="academyMaxPriceFilter">Max Price</label>
                <input
                  id="academyMaxPriceFilter"
                  type="number"
                  min="0"
                  value={filters.max_price}
                  onChange={(e) => setFilters((prev) => ({ ...prev, max_price: e.target.value }))}
                />
              </div>
            </div>

            <button className="btn-secondary" type="button" onClick={runDiscovery} disabled={loadingAcademies}>
              {loadingAcademies ? "Searching..." : "Apply Academy Filters"}
            </button>
          </div>

          {loadingAcademies ? <p className="muted">Loading academies...</p> : null}
          {!loadingAcademies && academies.length === 0 ? (
            <p className="muted">
              No active academies available right now. An academy needs an active subscription first.
            </p>
          ) : null}

          {academies.length > 0 ? (
            <div className="form-grid" style={{ marginTop: "16px" }}>
              <div>
                <label htmlFor="academySelect">Academy</label>
                <select
                  id="academySelect"
                  value={selectedAcademyId}
                  onChange={(e) => setSelectedAcademyId(e.target.value)}
                >
                  {academies.map((academy) => (
                    <option key={academy.academy_id} value={academy.academy_id}>
                      {academy.academy_name} - {academy.city || academy.country || "Location unknown"}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-secondary" type="button" onClick={loadCourses} disabled={loadingCourses}>
                {loadingCourses ? "Loading courses..." : "Load Courses"}
              </button>
            </div>
          ) : null}

          {selectedAcademy ? (
            <div className="detail-list" style={{ marginTop: "18px" }}>
              <p>
                <strong>Email:</strong> {selectedAcademy.email}
              </p>
              <p>
                <strong>Plan:</strong> {selectedAcademy.plan_type}
              </p>
              <p>
                <strong>Verified:</strong> {selectedAcademy.is_verified ? "Yes" : "No"}
              </p>
            </div>
          ) : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Enroll In Course</p>
          <h3>Select a course and pay from your wallet</h3>

          <form onSubmit={handleEnroll} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="courseSelect">Course</label>
              <select
                id="courseSelect"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={!courses.length}
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.course_title} - {course.subject_name} - PKR {course.enrollment_fee}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={enrolling || !selectedCourseId}>
              {enrolling ? "Enrolling..." : "Enroll Now"}
            </button>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}
          </form>

          {enrollmentResult ? (
            <div className="detail-list" style={{ marginTop: "18px" }}>
              <p>
                <strong>Enrollment ID:</strong> {enrollmentResult.enrollment?.enrollment_id}
              </p>
              <p>
                <strong>Status:</strong> {enrollmentResult.enrollment?.status}
              </p>
              <p>
                <strong>Paid:</strong> PKR {enrollmentResult.payment?.amount_total}
              </p>
              <p>
                <strong>Wallet after enrollment:</strong> PKR {enrollmentResult.student_wallet?.balance_after}
              </p>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: "18px" }}>
              Select a course to review the fee and complete your enrollment.
            </p>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
