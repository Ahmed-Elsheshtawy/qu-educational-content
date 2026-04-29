import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// JWT authentication middleware for admin panel access
export const authenticateJWT = (req, res, next) => {
  const token = req.cookies?.adminToken;

  if (!token) {
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // Redirect to login page if no token
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    // Clear invalid token
    res.clearCookie('adminToken');
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
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
    { expiresIn: '100y' } // Lasts forever (100 years)
  );

  // Set token in httpOnly cookie
  res.cookie('adminToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 100 * 365 * 24 * 60 * 60 * 1000 // 100 years
  });

  res.json({ message: 'Login successful', token });
};

// Logout endpoint to clear JWT
export const logoutAdmin = (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logout successful' });
};

export default authenticateJWT;
