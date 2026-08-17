import { prisma } from "../config/prisma.js";

// Add comment
export const addComment = async (req, res) => {
    try {
        const { userId } = req.auth();
        const { content, taskId } = req.body;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        if (!taskId || !content?.trim()) {
            return res.status(400).json({
                message: "Task ID and comment content are required",
            });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: {
                id: taskId,
            },
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        // Get project and project members
        const project = await prisma.project.findUnique({
            where: {
                id: task.projectId,
            },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        // Check project membership
        const isProjectMember = project.members.some(
            (member) => member.userId === userId
        );

        // Project owner/team lead should also have access
        const isProjectOwner = project.team_lead === userId;

        if (!isProjectMember && !isProjectOwner) {
            return res.status(403).json({
                message: "You are not a member of this project",
            });
        }

        // Create comment
        const comment = await prisma.comment.create({
            data: {
                taskId,
                content: content.trim(),
                userId,
            },
            include: {
                user: true,
            },
        });

        return res.status(201).json({
            comment,
        });

    } catch (error) {
        console.error("ADD COMMENT ERROR:", error);

        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};


// Get comments for task
export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;

        const comments = await prisma.comment.findMany({
            where: {
                taskId,
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        return res.status(200).json({
            comments,
        });

    } catch (error) {
        console.error("GET COMMENTS ERROR:", error);

        return res.status(500).json({
            message: error.code || error.message,
        });
    }
};