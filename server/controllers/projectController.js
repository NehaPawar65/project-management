import { prisma } from "../config/prisma.js";

// Create Project
export const createProject = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const {
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      team_members,
      team_lead,
      progress,
      priority,
    } = req.body;

    // Check if user has admin role in the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
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

    if (
      !workspace.members.some(
        (member) =>
          member.userId === userId && member.role === "ADMIN"
      )
    ) {
      return res.status(403).json({
        message: "You do not have permission to create a project",
      });
    }

    // Get team lead using email
    const teamLead = team_lead
      ? await prisma.user.findUnique({
          where: { email: team_lead },
          select: { id: true },
        })
      : null;

    // Create project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        status,
        priority,
        progress,
        team_lead: teamLead ? teamLead.id : null,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });

    // Add members to the project if they are in the workspace
    if (team_members?.length > 0) {
      const membersToAdd = [];

      workspace.members.forEach((member) => {
        if (team_members.includes(member.user.email)) {
          membersToAdd.push(member.user.id);
        }
      });

      if (membersToAdd.length > 0) {
        await prisma.projectMember.createMany({
          data: membersToAdd.map((memberId) => ({
            projectId: project.id,
            userId: memberId,
          })),
        });
      }
    }

    // Get project with members
    const projectWithMembers = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        tasks: {
          include: {
            assigned_to: true,
            comments: {
              include: {
                user: true,
              },
            },
          },
        },
        owner: true,
      },
    });

    return res.json({
      project: projectWithMembers,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Create Project Error:", error);

    return res.status(500).json({
      message: error.message || error.code,
    });
  }
};

// Update Project
export const updateProject = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const {
      id,
      workspaceId,
      description,
      name,
      status,
      start_date,
      end_date,
      progress,
      priority,
    } = req.body;

    // Check if user has admin role in the workspace
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

    const isAdmin = workspace.members.some(
      (member) =>
        member.userId === userId && member.role === "ADMIN"
    );

    // If not admin, check whether user is project lead
    if (!isAdmin) {
      const existingProject = await prisma.project.findUnique({
        where: {
          id,
        },
      });

      if (!existingProject) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      if (existingProject.team_lead !== userId) {
        return res.status(403).json({
          message:
            "You don't have permission to update projects in this workspace",
        });
      }
    }

    const project = await prisma.project.update({
      where: {
        id,
      },
      data: {
        workspaceId,
        description,
        name,
        status,
        priority,
        progress,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
      },
    });

    return res.json({
      project,
      message: "Project Updated Successfully",
    });
  } catch (error) {
    console.error("Update Project Error:", error);

    return res.status(500).json({
      message: error.code || error.message,
    });
  }
};

// Add Member to Project
export const addMemberToProject = async (req, res) => {
  try {
    const { userId } = await req.auth();
    const { projectId } = req.params;
    const { email } = req.body;

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
        message: "Project not found",
      });
    }

    // Only project lead can add members
    if (project.team_lead !== userId) {
      return res.status(403).json({
        message: "Only project lead can add members",
      });
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      (member) => member.user.email === email
    );

    if (existingMember) {
      return res.status(400).json({
        message: "User is already a member",
      });
    }

    // Find user using email
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not Found",
      });
    }

    // Add member
    const member = await prisma.projectMember.create({
      data: {
        userId: user.id,
        projectId,
      },
    });

    return res.json({
      member,
      message: "Member added Successfully",
    });
  } catch (error) {
    console.error("Add Member Error:", error);

    return res.status(500).json({
      message: error.message || error.code,
    });
  }
};