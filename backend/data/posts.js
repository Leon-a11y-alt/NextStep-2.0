// In-memory forum posts "table".
// status: "approved" | "pending" | "rejected"
let posts = [
  {
    id: 1,
    userId: 2,
    author: "Priya Nair",
    authorYear: "Year 3",
    title: "How I recovered after failing my first internship interview",
    category: "Internship rejection",
    content:
      "I failed my first interview because my GitHub was almost empty. I started building one small project every week and writing a short README for each. Three months later my portfolio looked completely different and I got an offer.",
    suggestedAction: "Build one small project every week and update my portfolio",
    status: "approved",
    upvotes: 42,
    createdAt: "2026-02-10",
  },
  {
    id: 2,
    userId: 2,
    author: "Priya Nair",
    authorYear: "Year 3",
    title: "A simple exam prep routine that actually works",
    category: "Exam preparation",
    content:
      "Instead of cramming, I studied one topic per day and did a 20-minute recap of the previous day first. Spaced repetition made a huge difference for my grades.",
    suggestedAction: "Study one topic daily and recap yesterday's topic for 20 minutes",
    status: "approved",
    upvotes: 35,
    createdAt: "2026-02-14",
  },
  {
    id: 3,
    userId: 1,
    author: "Alex Tan",
    authorYear: "Year 2",
    title: "Beating procrastination with the 2-minute rule",
    category: "Time management",
    content:
      "Whenever a task felt too big, I told myself to just do 2 minutes of it. Starting is the hardest part, and most times I kept going well past the 2 minutes.",
    suggestedAction: "Start every hard task with just 2 focused minutes",
    status: "approved",
    upvotes: 28,
    createdAt: "2026-02-18",
  },
  {
    id: 4,
    userId: 1,
    author: "Alex Tan",
    authorYear: "Year 2",
    title: "How I finally kept a consistent coding practice",
    category: "Programming practice",
    content:
      "I committed to solving one easy algorithm problem every weekday morning before class. Keeping it small and daily made it stick.",
    suggestedAction: "Solve one easy coding problem every weekday morning",
    status: "approved",
    upvotes: 19,
    createdAt: "2026-02-20",
  },
  // --- Pending posts below are here so the Admin Moderation page has
  //     something to approve/reject during the demo. ---
  {
    id: 5,
    userId: 1,
    author: "Alex Tan",
    authorYear: "Year 2",
    title: "My scholarship application checklist",
    category: "Scholarship application",
    content:
      "Here is the checklist I used: strong personal statement, two recommendation letters, a clear CCA record, and proof of community work. Start at least a month early.",
    suggestedAction: "Prepare scholarship documents one month before the deadline",
    status: "pending",
    upvotes: 0,
    createdAt: "2026-02-24",
  },
  {
    id: 6,
    userId: 2,
    author: "Priya Nair",
    authorYear: "Year 3",
    title: "Working well in project teams",
    category: "Project teamwork",
    content:
      "We used a shared task board and a 10-minute daily check-in. Everyone knew what to do and nothing was forgotten at the last minute.",
    suggestedAction: "Run a 10-minute daily team check-in during projects",
    status: "pending",
    upvotes: 0,
    createdAt: "2026-02-25",
  },
];

let nextPostId = 7;
const getNextPostId = () => nextPostId++;

module.exports = { posts, getNextPostId };
