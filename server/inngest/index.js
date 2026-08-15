import { Inngest } from "inngest";
import { prisma } from "../config/prisma.js";

// Create Inngest client
export const inngest = new Inngest({
  id: "project-management",
});

// ===============================
// User Created
// ===============================

const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-creation-from-clerk",
    triggers: {
      event: "clerk/user.created",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
    });
  }
);

// ===============================
// User Deleted
// ===============================

const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: {
      event: "clerk/user.deleted",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// ===============================
// User Updated
// ===============================

const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: {
      event: "clerk/user.updated",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
        image: data?.image_url || "",
      },
    });
  }
);

// ===============================
// Workspace Created
// ===============================

const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-creation-from-clerk",
    triggers: {
      event: "clerk/organization.created",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.owner_id,
        image: data.image_url || "",
      },
    });

    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);

// ===============================
// Workspace Updated
// ===============================

const syncWorkspaceUpdation = inngest.createFunction(
  {
    id: "sync-workspace-updation-from-clerk",
    triggers: {
      event: "clerk/organization.updated",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        image: data.image_url || "",
      },
    });
  }
);

// ===============================
// Workspace Deleted
// ===============================

const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "sync-workspace-deletion-from-clerk",
    triggers: {
      event: "clerk/organization.deleted",
    },
  },
  async ({ event }) => {
    const { data } = event;

    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// ===============================
// Workspace Member Created
// ===============================

const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-creation-from-clerk",
    triggers: {
      event: "clerk/organizationInvitation.accepted",
    },
  },
  async ({ event }) => {
    const { data } = event;

  await prisma.workspace.create({
    data: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      ownerId: data.owner_id,
      image: data.image_url || "",
    },
  });

});

// ===============================
// Export all functions
// ===============================

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkspaceMemberCreation,
];