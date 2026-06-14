import { create } from "zustand";

const STORAGE_KEY = "student_dashboard_state";

function readInitialState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        walletId: "",
        walletBalance: null,
        lastTopupAmount: null,
        bookingCount: 0,
        enrollmentCount: 0,
      };
    }

    return JSON.parse(raw);
  } catch {
    return {
      walletId: "",
      walletBalance: null,
      lastTopupAmount: null,
      bookingCount: 0,
      enrollmentCount: 0,
    };
  }
}

function persist(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialState = readInitialState();

const useStudentStore = create((set) => ({
  ...initialState,

  setWalletSnapshot: ({ walletId, walletBalance, lastTopupAmount = null }) =>
    set((state) => {
      const next = {
        ...state,
        walletId: walletId ?? state.walletId,
        walletBalance: walletBalance ?? state.walletBalance,
        lastTopupAmount: lastTopupAmount ?? state.lastTopupAmount,
      };
      persist(next);
      return next;
    }),

  applyBookingResult: ({ walletBalance }) =>
    set((state) => {
      const next = {
        ...state,
        walletBalance: walletBalance ?? state.walletBalance,
        bookingCount: state.bookingCount + 1,
      };
      persist(next);
      return next;
    }),

  applyEnrollmentResult: ({ walletBalance }) =>
    set((state) => {
      const next = {
        ...state,
        walletBalance: walletBalance ?? state.walletBalance,
        enrollmentCount: state.enrollmentCount + 1,
      };
      persist(next);
      return next;
    }),

  setBookingCount: (bookingCount) =>
    set((state) => {
      const next = {
        ...state,
        bookingCount,
      };
      persist(next);
      return next;
    }),

  setEnrollmentCount: (enrollmentCount) =>
    set((state) => {
      const next = {
        ...state,
        enrollmentCount,
      };
      persist(next);
      return next;
    }),
}));

export default useStudentStore;
