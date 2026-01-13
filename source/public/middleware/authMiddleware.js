// Simple password-based authentication middleware
const authenticateAdmin = (req, res, next) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const providedPassword = req.headers['x-admin-password'] || req.body.adminPassword;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized - Invalid admin password' });
  }

  next();
};

export default authenticateAdmin;