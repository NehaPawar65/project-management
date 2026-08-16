import { prisma } from "../config/prisma.js";

// =====================================================
// CREATE PROJECT
// =====================================================
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

    console.log("Create Project Debug:");
    console.log("Clerk userId:", userId);
    console.log("workspaceId:", workspaceId);

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

    console.log(
      "Workspace members:",
      workspace.members.map((member) => ({
        userId: member.userId,
        email: member.user?.email,
        role: member.role,
      }))
    );

    // Check if current user is workspace admin
    const isAdmin = workspace.members.some(
      (member) =>
        member.userId === userId &&
        member.role === "ADMIN"
    );

    console.log("Is Admin:", isAdmin);

    if (!isAdmin) {
      return res.status(403).json({
        message: "You do not have permission to create a project",
      });
    }

    // Get project lead using email
    const teamLead = team_lead
      ? await prisma.user.findUnique({
          where: {
            email: team_lead,
          },
          select: {
            id: true,
          },
        })
      : null;

    if (!teamLead) {
      return res.status(404).json({
        message: "Project lead user not found",
      });
    }

    console.log("Project lead:", teamLead.id);

    // Create project
    const project = await prisma.project.create({
      data: {
        workspaceId,
        name,
        description,
        status,
        priority,
        progress,
        team_lead: teamLead.id,
        start_date: start_date
          ? new Date(start_date)
          : null,
        end_date: end_date
          ? new Date(end_date)
          : null,
      },
    });

    console.log("Project created:", project.id);

    // Add members to project
    if (team_members?.length > 0) {
      const membersToAdd = [];

      workspace.members.forEach((member) => {
        if (
          member.user?.email &&
          team_members.includes(member.user.email)
        ) {
          membersToAdd.push(member.user.id);
        }
      });

      console.log("Members to add:", membersToAdd);

      if (membersToAdd.length > 0) {
        await prisma.projectMember.createMany({
          data: membersToAdd.map((memberId) => ({
            projectId: project.id,
            userId: memberId,
          })),
        });
      }
    }

    // Get created project with members, tasks and comments
    const projectWithMembers =
      await prisma.project.findUnique({
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
              // Correct Prisma relation name
              assignee: true,

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

    return res.status(201).json({
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


// =====================================================
// UPDATE PROJECT
// =====================================================
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

    // Find workspace
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

    // Check admin
    const isAdmin = workspace.members.some(
      (member) =>
        member.userId === userId &&
        member.role === "ADMIN"
    );

    // If not admin, check project lead
    if (!isAdmin) {
      const existingProject =
        await prisma.project.findUnique({
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

    // Update project
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
        start_date: start_date
          ? new Date(start_date)
          : null,
        end_date: end_date
          ? new Date(end_date)
          : null,
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


// =====================================================
// ADD MEMBER TO PROJECT
// =====================================================
export const addMemberToProject = async (req, res) => {
  try {
    const { userId } = await req.auth();

    const { projectId } = req.params;
    const { email } = req.body;

    // Find project
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

    // Find user
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