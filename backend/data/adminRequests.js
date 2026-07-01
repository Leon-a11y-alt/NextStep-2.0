// In-memory admin-access requests + reported content.
// status: "pending" | "approved" | "rejected"  (requests)
// status: "open" | "resolved"                    (reports)
let adminRequests = [
  { id: 1, userId: 2, name: "Priya Nair", reason: "I help moderate the study-habits category and would like moderator access.", status: "pending", reviewedBy: null, reviewedAt: null },
];

let reports = [
  { id: 1, postId: 4, reportedBy: "Priya Nair", reason: "Possible duplicate of another coding-practice post.", status: "open" },
];

let nextRequestId = 2;
let nextReportId = 2;
const getNextRequestId = () => nextRequestId++;
const getNextReportId = () => nextReportId++;

module.exports = { adminRequests, reports, getNextRequestId, getNextReportId };
