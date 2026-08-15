import { prisma } from "../config/prisma.js";

// =====================================================
// Get all workspaces for the logged-in user
// =====================================================

export const getUserWorkspaces = async (req, res) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

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

        return res.status(200).json({
            workspaces
        });

    } catch (error) {
        console.error("Get workspaces error:", error);

        return res.status(500).json({
            error: "Failed to fetch workspaces"
        });
    }
};


// =====================================================
// Add member to workspace
// =====================================================

export const addMember = async (req, res) => {
    try {
        const currentUserId = req.userId;

        if (!currentUserId) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const {
            email,
            role,
            workspaceId,
            message
        } = req.body;

        // -------------------------------------------------
        // Validate required fields
        // -------------------------------------------------

        if (!email || !workspaceId || !role) {
            return res.status(400).json({
                error: "Email, workspaceId and role are required"
            });
        }

        // -------------------------------------------------
        // Validate role
        // -------------------------------------------------

        if (!["ADMIN", "MEMBER"].includes(role)) {
            return res.status(400).json({
                error: "Invalid role"
            });
        }

        // -------------------------------------------------
        // Find user by email
        // -------------------------------------------------

        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        // -------------------------------------------------
        // Find workspace
        // -------------------------------------------------

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

        // -------------------------------------------------
        // Check whether current user is an ADMIN
        // -------------------------------------------------

        const currentMember = workspace.members.find(
            (member) => member.userId === currentUserId
        );

        if (!currentMember || currentMember.role !== "ADMIN") {
            return res.status(403).json({
                error: "You do not have admin privileges to add members to this workspace"
            });
        }

        // -------------------------------------------------
        // Check whether target user is already a member
        // -------------------------------------------------

        const existingMember = workspace.members.find(
            (member) => member.userId === user.id
        );

        if (existingMember) {
            return res.status(400).json({
                error: "User is already a member of this workspace"
            });
        }

        // -------------------------------------------------
        // Add workspace member
        // -------------------------------------------------

        const member = await prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId: workspace.id,
                role: role,
                message: message || ""
            }
        });

        return res.status(201).json({
            message: "Member added successfully",
            member
        });

    } catch (error) {
        console.error("Add member error:", error);

        return res.status(500).json({
            error: "Failed to add member"
        });
    }
};