// Central error handler. Any route that calls next(err) ends up here,
// so error responses stay consistent across the whole API.
function errorHandler(err, req, res, next) {
  console.error("API error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Something went wrong on the server.",
  });
}

// 404 handler for unknown routes.
function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
