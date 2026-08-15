import { prisma } from "../config/prisma.js";

// Get all workspaces for the logged-in user
export const getUserWorkspaces = async (req, res) => {
    try {
        const { userId } = await req.auth();

        const workspaces = await prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId: userId
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: true
                    }
                },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignee: true,
                                comments: {
                                    include: {
                                        user: true
                                    }
                                }
                            }
                        }
                    }
                },
                owner: true
            }
        });

        res.json({
            workspaces
        });
    } catch (error) {
        console.log("Get workspaces error:", error);

        res.status(500).json({
            error: "Failed to fetch workspaces"
        });
    }
};


// Add member to workspace
export const addMember = async (req, res) => {
    try {
        const { userId } = await req.auth();

        const {
            email,
            role,
            workspaceId,
            message
        } = req.body;

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        if (!workspaceId || !role) {
            return res.status(400).json({
                error: "Missing required fields"
            });
        }

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(403).json({
                error: "Invalid role"
            });
        }

        // Fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where: {
                id: workspaceId
            },
            include: {
                members: true
            }
        });

        if (!workspace) {
            return res.status(404).json({
                error: "Workspace not found"
            });
        }

        // Check creator/admin has permission
        const isAdmin = workspace.members.find(
            (member) =>
                member.userId === userId &&
                member.role === "ADMIN"
        );

        if (!isAdmin) {
            return res.status(401).json({
                error:
                    "You do not have admin privileges to add members to this workspace"
            });
        }

        // Check if user is already a member
        const existingMember = workspace.members.find(
            (member) => member.userId === user.id
        );

        if (existingMember) {
            return res.status(400).json({
                error: "User is already a member of this workspace"
            });
        }

        // Add member
        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: workspace.id,
                role: role
            }
        });

        res.json({
            message: "Member added successfully",
            member
        });

    } catch (error) {
        console.log("Add member error:", error);

        res.status(500).json({
            error: "Failed to add member"
        });
    }
};