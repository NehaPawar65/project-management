import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import workspaceRouter from './routes/workspaceRoutes.js';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware()); 

app.get('/', (req, res) => {
    res.send('Server is running');
});

app.use("/api/inngest", serve({ client: inngest, functions }));

//Routes
app.use('/api/workspaces', workspaceRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;