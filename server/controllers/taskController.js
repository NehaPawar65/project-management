import { prisma } from "../config/prisma.js";
import { inngest } from "../inngest/index.js";

// ========================================
// CREATE TASK
// ========================================

export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();

        const {
            projectId,
            title,
            description,
            type,
            status,
            priority,
            assigneeId,
            due_date,
        } = req.body;

        const origin =
            req.get("origin") || "http://localhost:5173";

        // ========================================
        // CHECK PROJECT
        // ========================================

        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
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
                message: "Project Not found",
            });
        }

        // ========================================
        // CHECK PROJECT ADMIN / TEAM LEAD
        // ========================================

        if (project.team_lead !== userId) {
            return res.status(403).json({
                message:
                    "You don't have admin privileges for this project",
            });
        }

        // ========================================
        // CHECK ASSIGNEE
        // ========================================

        if (
            assigneeId &&
            !project.members.find(
                (member) =>
                    member.user.id === assigneeId
            )
        ) {
            return res.status(403).json({
                message:
                    "Assignee is not a member of the project",
            });
        }

        // ========================================
        // CREATE TASK
        // ========================================

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                priority,
                assigneeId: assigneeId || null,
                status,
                type,
                due_date: due_date
                    ? new Date(due_date)
                    : null,
            },
        });

        // ========================================
        // SEND TASK ASSIGNMENT EVENT
        // ONLY IF TASK HAS ASSIGNEE
        // ========================================

        if (assigneeId) {
            console.log(
                "📧 Sending task assignment event..."
            );

            try {
                await inngest.send({
                    name: "app/task.assigned",

                    data: {
                        taskId: task.id,
                        origin,
                    },
                });

                console.log(
                    "✅ Task assignment event sent successfully"
                );
            } catch (inngestError) {
                console.log(
                    "❌ Failed to send Inngest task assignment event"
                );

                console.log(inngestError);
            }
        } else {
            console.log(
                "ℹ️ No assignee selected. Email will not be sent."
            );
        }

        // ========================================
        // GET TASK WITH ASSIGNEE
        // ========================================

        const taskWithAssignee =
            await prisma.task.findUnique({
                where: {
                    id: task.id,
                },

                include: {
                    assignee: true,
                    project: true,
                },
            });

        return res.json({
            task: taskWithAssignee,
            message: "Task Created Successfully",
        });
    } catch (error) {
        console.log(
            "❌ CREATE TASK ERROR"
        );

        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};

// ========================================
// UPDATE TASK
// ========================================

export const updateTask = async (req, res) => {
    try {
        const { userId } = await req.auth();

        // ========================================
        // FIND TASK
        // ========================================

        const task = await prisma.task.findUnique({
            where: {
                id: req.params.id,
            },
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found",
            });
        }

        // ========================================
        // FIND PROJECT
        // ========================================

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
                message: "Project Not found",
            });
        }

        // ========================================
        // CHECK TEAM LEAD
        // ========================================

        if (project.team_lead !== userId) {
            return res.status(403).json({
                message:
                    "You don't have admin privileges for this project",
            });
        }

        // ========================================
        // UPDATE TASK
        // ========================================

        const updatedTask = await prisma.task.update({
            where: {
                id: req.params.id,
            },

            data: req.body,
        });

        return res.json({
            task: updatedTask,
            message: "Task Updated Successfully",
        });
    } catch (error) {
        console.log(
            "❌ UPDATE TASK ERROR"
        );

        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};

// ========================================
// DELETE TASK
// ========================================

export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();

        const { taskIds } = req.body;

        // ========================================
        // FIND TASKS
        // ========================================

        const tasks = await prisma.task.findMany({
            where: {
                id: {
                    in: taskIds,
                },
            },
        });

        if (tasks.length === 0) {
            return res.status(404).json({
                message: "Task Not found",
            });
        }

        // ========================================
        // FIND PROJECT
        // ========================================

        const project = await prisma.project.findUnique({
            where: {
                id: tasks[0].projectId,
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
                message: "Project Not found",
            });
        }

        // ========================================
        // CHECK TEAM LEAD
        // ========================================

        if (project.team_lead !== userId) {
            return res.status(403).json({
                message:
                    "You don't have admin privileges for this project",
            });
        }

        // ========================================
        // DELETE TASKS
        // ========================================

        await prisma.task.deleteMany({
            where: {
                id: {
                    in: taskIds,
                },
            },
        });

        return res.json({
            message: "Task Deleted Successfully",
        });
    } catch (error) {
        console.log(
            "❌ DELETE TASK ERROR"
        );

        console.log(error);

        return res.status(500).json({
            message:
                error.code || error.message,
        });
    }
};