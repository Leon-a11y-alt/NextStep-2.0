// Very small request logger so we can see API activity in the terminal.
// Handy during demos to prove the frontend is really calling the backend.
function logger(req, res, next) {
  const time = new Date().toISOString();
  console.log(`[${time}] ${req.method} ${req.originalUrl}`);
  next();
}

module.exports = logger;
