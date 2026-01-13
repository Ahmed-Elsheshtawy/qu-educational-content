import express from 'express';
import { loginAdmin, logoutAdmin } from '../middleware/jwtMiddleware.js';

const authRouter = express.Router();

// POST /api/auth/login - Admin login
authRouter.post('/login', loginAdmin);

// POST /api/auth/logout - Admin logout
authRouter.post('/logout', logoutAdmin);

export default authRouter;
