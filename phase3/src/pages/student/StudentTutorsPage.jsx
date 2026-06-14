import { useEffect, useMemo, useState } from "react";
import RoleLayout from "../../components/layout/RoleLayout";
import { studentNavItems } from "../../features/student/navigation";
import {
  bookTutorSessionRequest,
  discoverTutorsRequest,
  studentTutorsRequest,
  tutorSlotsRequest,
} from "../../api/student";
import useStudentStore from "../../store/studentStore";

export default function StudentTutorsPage() {
  const subjectOptions = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Other"];
  const locationOptions = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Other"];
  const [tutors, setTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [sessionDate, setSessionDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bookingResult, setBookingResult] = useState(null);
  const [filters, setFilters] = useState({
    subjectPreset: "",
    subjectOther: "",
    locationPreset: "",
    locationOther: "",
    teaching_mode: "",
    min_rating: "",
    min_price: "",
    max_price: "",
  });
  const applyBookingResult = useStudentStore((state) => state.applyBookingResult);

  const subjectValue =
    filters.subjectPreset === "Other" ? filters.subjectOther.trim() : filters.subjectPreset.trim();
  const locationValue =
    filters.locationPreset === "Other" ? filters.locationOther.trim() : filters.locationPreset.trim();

  useEffect(() => {
    async function loadTutors() {
      setLoadingTutors(true);
      setError("");
      try {
        const data = await studentTutorsRequest();
        const tutorList = data?.tutors || [];
        setTutors(tutorList);
        if (tutorList[0]) {
          setSelectedTutorId(String(tutorList[0].tutor_id));
        }
      } catch (err) {
        setError(err?.response?.data?.error?.message || "Could not load tutors.");
      } finally {
        setLoadingTutors(false);
      }
    }

    loadTutors();
  }, []);

  const selectedTutor = useMemo(
    () => tutors.find((item) => String(item.tutor_id) === String(selectedTutorId)),
    [selectedTutorId, tutors]
  );

  const runDiscovery = async () => {
    setLoadingTutors(true);
    setError("");

    try {
      const query = {
        limit: 20,
        offset: 0,
      };

      const preparedFilters = {
        subject: subjectValue,
        location: locationValue,
        teaching_mode: filters.teaching_mode,
        min_rating: filters.min_rating,
        min_price: filters.min_price,
        max_price: filters.max_price,
      };

      Object.entries(preparedFilters).forEach(([key, value]) => {
        if (value !== "") query[key] = value;
      });

      const data = await discoverTutorsRequest(query);
      const tutorList = data?.tutors || [];
      setTutors(tutorList);
      setSelectedTutorId(tutorList[0] ? String(tutorList[0].tutor_id) : "");
      setSlots([]);
      setSelectedSlotId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Tutor search failed.");
    } finally {
      setLoadingTutors(false);
    }
  };

  const loadSlots = async () => {
    if (!selectedTutorId || !sessionDate) {
      setError("Choose a tutor and session date first.");
      return;
    }

    setLoadingSlots(true);
    setError("");
    setSuccess("");
    try {
      const data = await tutorSlotsRequest(selectedTutorId, sessionDate);
      setSlots(data?.slots || []);
      setSelectedSlotId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Could not load tutor slots.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!selectedTutorId || !selectedSlotId || !sessionDate) {
      setError("Choose tutor, date, and an available slot before booking.");
      return;
    }

    setBooking(true);
    setError("");
    setSuccess("");

    try {
      const data = await bookTutorSessionRequest({
        tutor_id: Number(selectedTutorId),
        date: sessionDate,
        slot_id: selectedSlotId,
      });
      setBookingResult(data);
      applyBookingResult({
        walletBalance: data.student_wallet?.balance_after,
      });
      setSuccess("Session booked successfully. Payment is now held in escrow.");
      setSlots((prev) =>
        prev.map((slot) =>
          slot.slot_id === selectedSlotId ? { ...slot, is_available: false, is_booked: true } : slot
        )
      );
      setSelectedSlotId("");
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Booking failed.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <RoleLayout
      roleTitle="Student"
      roleSubtitle="Search tutors and book sessions."
      accentLabel="Student"
      navItems={studentNavItems}
      headerLabel="Tutors"
      quickStats={[
        {
          label: "Search Focus",
          value: subjectValue || locationValue || filters.teaching_mode || "All tutors",
          note: "Current search focus",
        },
        {
          label: "Bookable Tutors",
          value: loadingTutors ? "..." : String(tutors.length),
          note: "Tutors matching your search",
        },
        { label: "Session Price", value: "PKR 1000", note: "A common session fee" },
      ]}
    >
      <div className="panel-grid">
        <article className="soft-card">
          <p className="section-kicker">Find Tutors</p>
          <h3>Subscribed tutors available for booking</h3>

          <div className="form-grid" style={{ marginTop: "16px" }}>
            <div className="row">
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label htmlFor="subjectFilter">Subject</label>
                <select
                  id="subjectFilter"
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
                <label htmlFor="locationFilter">Location</label>
                <select
                  id="locationFilter"
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
                <label htmlFor="subjectOther">Other Subject</label>
                <input
                  id="subjectOther"
                  value={filters.subjectOther}
                  onChange={(e) => setFilters((prev) => ({ ...prev, subjectOther: e.target.value }))}
                  placeholder="Type a custom subject"
                />
              </div>
            ) : null}

            {filters.locationPreset === "Other" ? (
              <div>
                <label htmlFor="locationOther">Other Location</label>
                <input
                  id="locationOther"
                  value={filters.locationOther}
                  onChange={(e) => setFilters((prev) => ({ ...prev, locationOther: e.target.value }))}
                  placeholder="Type a custom city or country"
                />
              </div>
            ) : null}

            <div className="row">
              <div style={{ flex: 1, minWidth: "160px" }}>
                <label htmlFor="modeFilter">Teaching Mode</label>
                <select
                  id="modeFilter"
                  value={filters.teaching_mode}
                  onChange={(e) => setFilters((prev) => ({ ...prev, teaching_mode: e.target.value }))}
                >
                  <option value="">Any</option>
                  <option value="online">Online</option>
                  <option value="physical">Physical</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="ratingFilter">Min Rating</label>
                <input
                  id="ratingFilter"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filters.min_rating}
                  onChange={(e) => setFilters((prev) => ({ ...prev, min_rating: e.target.value }))}
                />
              </div>
            </div>

            <div className="row">
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="minPriceFilter">Min Price</label>
                <input
                  id="minPriceFilter"
                  type="number"
                  min="0"
                  value={filters.min_price}
                  onChange={(e) => setFilters((prev) => ({ ...prev, min_price: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1, minWidth: "120px" }}>
                <label htmlFor="maxPriceFilter">Max Price</label>
                <input
                  id="maxPriceFilter"
                  type="number"
                  min="0"
                  value={filters.max_price}
                  onChange={(e) => setFilters((prev) => ({ ...prev, max_price: e.target.value }))}
                />
              </div>
            </div>

            <button className="btn-secondary" type="button" onClick={runDiscovery} disabled={loadingTutors}>
              {loadingTutors ? "Searching..." : "Apply Tutor Filters"}
            </button>
          </div>

          {loadingTutors ? <p className="muted">Loading tutors...</p> : null}

          {!loadingTutors && tutors.length === 0 ? (
            <p className="muted">No active tutors available right now. Ask a tutor to purchase a subscription first.</p>
          ) : null}

          {tutors.length > 0 ? (
            <div className="form-grid" style={{ marginTop: "16px" }}>
              <div>
                <label htmlFor="tutorSelect">Tutor</label>
                <select
                  id="tutorSelect"
                  value={selectedTutorId}
                  onChange={(e) => setSelectedTutorId(e.target.value)}
                >
                  {tutors.map((tutor) => (
                    <option key={tutor.tutor_id} value={tutor.tutor_id}>
                      {tutor.name} - {tutor.city || tutor.country || "Location unknown"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sessionDate">Session Date</label>
                <input
                  id="sessionDate"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>

              <button className="btn-secondary" type="button" onClick={loadSlots} disabled={loadingSlots}>
                {loadingSlots ? "Loading slots..." : "Load Available Slots"}
              </button>
            </div>
          ) : null}

          {selectedTutor ? (
            <div className="detail-list" style={{ marginTop: "18px" }}>
              <p>
                <strong>Teaching mode:</strong> {selectedTutor.teaching_mode || "-"}
              </p>
              <p>
                <strong>Email:</strong> {selectedTutor.email}
              </p>
              <p>
                <strong>Plan:</strong> {selectedTutor.plan_type}
              </p>
            </div>
          ) : null}
        </article>

        <article className="soft-card">
          <p className="section-kicker">Book Session</p>
          <h3>Choose a slot and hold payment in escrow</h3>

          <form onSubmit={handleBooking} className="form-grid" style={{ marginTop: "16px" }}>
            <div>
              <label htmlFor="slotSelect">Available Slots</label>
              <select
                id="slotSelect"
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                disabled={!slots.length}
              >
                <option value="">Select a slot</option>
                {slots
                  .filter((slot) => slot.is_available)
                  .map((slot) => (
                    <option key={slot.slot_id} value={slot.slot_id}>
                      {slot.slot_id} - {slot.start_time} to {slot.end_time}
                    </option>
                  ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={booking || !selectedSlotId}>
              {booking ? "Booking..." : "Book Session"}
            </button>

            {error ? <p className="error">{error}</p> : null}
            {success ? <p className="success">{success}</p> : null}
          </form>

          {bookingResult ? (
            <div className="detail-list" style={{ marginTop: "18px" }}>
              <p>
                <strong>Booking ID:</strong> {bookingResult.booking?.booking_id}
              </p>
              <p>
                <strong>Escrow status:</strong> {bookingResult.payment?.escrow_status}
              </p>
              <p>
                <strong>Amount:</strong> PKR {bookingResult.payment?.amount_total}
              </p>
              <p>
                <strong>Wallet after booking:</strong> PKR {bookingResult.student_wallet?.balance_after}
              </p>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: "18px" }}>
              Load available slots, choose one that suits you, and confirm your booking.
            </p>
          )}
        </article>
      </div>
    </RoleLayout>
  );
}
