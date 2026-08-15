import express from 'express';
import {
    addMember,
    getUserWorkspaces
} from '../controllers/workspaceController.js';

const workspaceRoutes = express.Router();

workspaceRoutes.get('/', getUserWorkspaces);
workspaceRoutes.post('/add-member', addMember);

export default workspaceRoutes;