import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import coursesRouter from './public/routes/coursesRoute.js';
import resourcesRouter from './public/routes/resourcesRoute.js';
import adminRouter from './public/routes/adminRoute.js';
import authRouter from './public/routes/authRoute.js';
import authenticateJWT from './public/middleware/jwtMiddleware.js';
import { connectToDatabase } from './public/services/mongoService.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cookieParser());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public', 'frontend')));

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/admin', adminRouter);

// Login page route
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'frontend', 'views', 'login.html'));
});

// Submit resource page route
app.get('/submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'frontend', 'views', 'submit.html'));
});

// Protected admin panel route
app.get('/admin', authenticateJWT, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'frontend', 'views', 'admin.html'));
});

app.get('/course-submit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'frontend', 'views', 'courseSubmit.html'));
});

// SPA fallback - serve index.html for client-side routes (excluding API routes and static files)
app.get(/^\/(?!api).*/, (req, res) => {
  // Don't serve index.html for admin route (handled above) or files with extensions
  if (req.path === '/admin' || req.path.includes('.')) {
    return;
  }
  res.sendFile(path.join(__dirname, 'public', 'frontend', 'index.html'));
});

// Connect to database immediately for serverless
connectToDatabase();

// Only listen on port in development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;