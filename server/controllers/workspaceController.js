import { prisma } from "../config/prisma.js";

// =====================================================
// GET LOGGED-IN USER'S WORKSPACES
// =====================================================
export const getUserWorkspaces = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        projects: {
          include: {
            members: {
              include: {
                user: true,
              },
            },
            tasks: {
              include: {
                assignee: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.json({ workspaces });
  } catch (error) {
    console.error("Get Workspaces Error:", error);

    return res.status(500).json({
      message: error.message || error.code,
    });
  }
};

// =====================================================
// ADD MEMBER TO WORKSPACE
// =====================================================
export const addMember = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const { workspaceId, email, role } = req.body;

    // Find workspace and its members
    const workspace = await prisma.workspace.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Only a workspace admin can add members
    const isAdmin = workspace.members.some(
      (member) => member.userId === userId && member.role === "ADMIN"
    );

    if (!isAdmin) {
      return res.status(403).json({
        message: "You do not have permission to add members to this workspace",
      });
    }

    // Check if user is already a member
    const existingMember = workspace.members.find(
      (member) => member.user.email === email
    );

    if (existingMember) {
      return res.status(400).json({
        message: "User is already a member of this workspace",
      });
    }

    // Find the user being added
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      include: {
        user: true,
      },
    });

    return res.json({
      member,
      message: "Member added successfully",
    });
  } catch (error) {
    console.error("Add Workspace Member Error:", error);

    return res.status(500).json({
      message: error.message || error.code,
    });
  }
};