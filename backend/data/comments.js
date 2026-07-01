// In-memory comments "table".
let comments = [
  { id: 1, postId: 1, userId: 1, author: "Alex Tan", authorYear: "Year 2", text: "This motivated me to finally start committing daily. Thank you!", createdAt: "2026-02-11" },
  { id: 2, postId: 1, userId: 3, author: "Admin Officer", authorYear: "Year 3", text: "Great, honest advice. Portfolios matter a lot for interviews.", createdAt: "2026-02-12" },
  { id: 3, postId: 2, userId: 1, author: "Alex Tan", authorYear: "Year 2", text: "The recap-first idea is genius. Trying it this week.", createdAt: "2026-02-15" },
];

let nextCommentId = 4;
const getNextCommentId = () => nextCommentId++;

module.exports = { comments, getNextCommentId };
