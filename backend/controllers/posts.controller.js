// Forum posts CRUD + upvote.
const { posts, getNextPostId } = require("../data/posts");

// GET /api/posts?category=&search=
// Returns approved posts, with optional category + search filtering.
function getPosts(req, res) {
  const { category, search } = req.query;
  let result = posts.filter((p) => p.status === "approved");

  if (category && category !== "All") {
    result = result.filter((p) => p.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
    );
  }

  // Newest first.
  result = [...result].sort((a, b) => b.id - a.id);
  res.json(result);
}

// GET /api/posts/:id
function getPost(req, res) {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });
  res.json(post);
}

// POST /api/posts
// New posts are auto-approved so they appear in the forum right away for
// the demo. In a real system these would start as "pending".
function createPost(req, res) {
  const { title, category, content, suggestedAction, author, authorYear, userId } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  const newPost = {
    id: getNextPostId(),
    userId: userId || null,
    author: author || "Anonymous",
    authorYear: authorYear || "Year 1",
    title,
    category: category || "Study habits",
    content,
    suggestedAction: suggestedAction || "",
    status: "approved",
    upvotes: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  posts.unshift(newPost);
  res.status(201).json(newPost);
}

// PUT /api/posts/:id
function updatePost(req, res) {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });

  const { title, category, content, suggestedAction } = req.body;
  if (title !== undefined) post.title = title;
  if (category !== undefined) post.category = category;
  if (content !== undefined) post.content = content;
  if (suggestedAction !== undefined) post.suggestedAction = suggestedAction;

  res.json(post);
}

// DELETE /api/posts/:id
function deletePost(req, res) {
  const index = posts.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: "Post not found." });
  const [removed] = posts.splice(index, 1);
  res.json({ message: "Post deleted.", post: removed });
}

// POST /api/posts/:id/upvote
function upvotePost(req, res) {
  const post = posts.find((p) => p.id === Number(req.params.id));
  if (!post) return res.status(404).json({ error: "Post not found." });
  post.upvotes += 1;
  res.json(post);
}

module.exports = {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  upvotePost,
};
