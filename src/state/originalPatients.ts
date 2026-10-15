import type { Patient } from "../types/domain";

// Trusted fictional identities shared by initial population and research eligibility.
export const originalPatients: readonly Patient[] = [
  {
    id: 1,
    record: "PNT-000001",
    first: "Roberto",
    middle: "M.",
    last: "Dela Cruz",
    dob: "1968-04-17",
    sex: "Male",
    locality: "Quezon City",
    phone: "",
    pin: "",
    facility: "Community Health Center",
  },
  {
    id: 2,
    record: "PNT-000002",
    first: "Elena",
    middle: "",
    last: "Reyes",
    dob: "1975-07-08",
    sex: "Female",
    locality: "San Mateo, Rizal",
    phone: "",
    pin: "",
    facility: "Community Health Center",
  },
  {
    id: 3,
    record: "PNT-000003",
    first: "Antonio",
    middle: "",
    last: "Santos",
    dob: "1982-01-13",
    sex: "Male",
    locality: "Marikina City",
    phone: "",
    pin: "",
    facility: "Community Health Center",
  },
];
