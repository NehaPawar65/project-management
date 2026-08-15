import express from 'express';
import {
    addMember,
    getUserWorkspaces
} from '../controllers/workspaceController.js';
import { protect } from '../middlewares/authMiddleware.js';

const workspaceRoutes = express.Router();

workspaceRoutes.get('/', protect, getUserWorkspaces);
workspaceRoutes.post('/add-member', protect, addMember);

export default workspaceRoutes;