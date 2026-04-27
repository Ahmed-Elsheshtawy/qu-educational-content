import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT authentication middleware for admin panel access
export const authenticateJWT = (req, res, next) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    // For API requests, return 401 instead of redirecting
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    // For HTML page requests, redirect to login
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    // Clear invalid token
    res.clearCookie('adminToken');
    // For API requests, return 401 instead of redirecting
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    // For HTML page requests, redirect to login
    return res.redirect('/login');
  }
};

// Login endpoint to generate JWT
export const loginAdmin = (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not configured' });
  }

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { role: 'admin', timestamp: Date.now() },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Set token in httpOnly cookie
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  res.json({ message: 'Login successful', token });
};

// Logout endpoint to clear JWT
export const logoutAdmin = (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logout successful' });
};

export default authenticateJWT;
