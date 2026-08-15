import { Inngest } from "inngest";
import { prisma } from "../config/prisma.js";

// ========================================
// CREATE INNGEST CLIENT
// ========================================

export const inngest = new Inngest({
    id: "project-management",
});

// ========================================
// USER CREATED
// ========================================

const syncUserCreation = inngest.createFunction(
    {
        id: "sync-user-creation-from-clerk",
        triggers: [
            {
                event: "clerk/user.created",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        console.log("Inngest: User created", data.id);

        await prisma.user.upsert({
            where: {
                id: data.id,
            },
            update: {
                email:
                    data?.email_addresses?.[0]?.email_address || "",
                name:
                    `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
                image: data?.image_url || "",
            },
            create: {
                id: data.id,
                email:
                    data?.email_addresses?.[0]?.email_address || "",
                name:
                    `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
                image: data?.image_url || "",
            },
        });

        console.log("Inngest: User saved to database");
    }
);

// ========================================
// USER UPDATED
// ========================================

const syncUserUpdation = inngest.createFunction(
    {
        id: "sync-user-updation-from-clerk",
        triggers: [
            {
                event: "clerk/user.updated",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        console.log("Inngest: User updated", data.id);

        await prisma.user.update({
            where: {
                id: data.id,
            },
            data: {
                email:
                    data?.email_addresses?.[0]?.email_address || "",
                name:
                    `${data?.first_name || ""} ${data?.last_name || ""}`.trim(),
                image: data?.image_url || "",
            },
        });

        console.log("Inngest: User updated in database");
    }
);

// ========================================
// USER DELETED
// ========================================

const syncUserDeletion = inngest.createFunction(
    {
        id: "sync-user-deletion-from-clerk",
        triggers: [
            {
                event: "clerk/user.deleted",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        console.log("Inngest: User deleted", data.id);

        await prisma.user.deleteMany({
            where: {
                id: data.id,
            },
        });

        console.log("Inngest: User deleted from database");
    }
);

// ========================================
// WORKSPACE / ORGANIZATION CREATED
// ========================================

const syncWorkspaceCreation = inngest.createFunction(
    {
        id: "sync-workspace-creation-from-clerk",
        triggers: [
            {
                event: "clerk/organization.created",
            },
        ],
    },
    async ({ event, step }) => {
        const { data } = event;

        console.log("====================================");
        console.log("WORKSPACE CREATION FUNCTION STARTED");
        console.log("Organization ID:", data.id);
        console.log("Organization name:", data.name);
        console.log("Organization slug:", data.slug);
        console.log("Created by:", data.created_by);
        console.log("====================================");

        // ========================================
        // STEP 1: FIND USER
        // ========================================

        const user = await step.run(
            "wait-for-user",
            async () => {
                const existingUser = await prisma.user.findUnique({
                    where: {
                        id: data.created_by,
                    },
                });

                console.log(
                    "Checking owner in Neon:",
                    data.created_by
                );

                if (!existingUser) {
                    throw new Error(
                        `User ${data.created_by} does not exist in Neon yet`
                    );
                }

                console.log(
                    "Owner found in Neon:",
                    existingUser.id
                );

                return existingUser;
            }
        );

        // ========================================
        // STEP 2: CREATE / UPDATE WORKSPACE
        // ========================================

        const workspace = await step.run(
            "sync-workspace",
            async () => {
                const workspace = await prisma.workspace.upsert({
                    where: {
                        id: data.id,
                    },

                    update: {
                        name: data.name,
                        slug: data.slug,
                        image_url: data.image_url || "",

                        owner: {
                            connect: {
                                id: user.id,
                            },
                        },
                    },

                    create: {
                        id: data.id,
                        name: data.name,
                        slug: data.slug,
                        image_url: data.image_url || "",

                        owner: {
                            connect: {
                                id: user.id,
                            },
                        },
                    },
                });

                console.log(
                    "Workspace saved:",
                    workspace.id
                );

                return workspace;
            }
        );

        // ========================================
        // STEP 3: CREATE / UPDATE ADMIN MEMBER
        // ========================================

        const member = await step.run(
            "sync-workspace-member",
            async () => {
                const member =
                    await prisma.workspaceMember.upsert({
                        where: {
                            userId_workspaceId: {
                                userId: user.id,
                                workspaceId: workspace.id,
                            },
                        },

                        update: {
                            role: "ADMIN",
                        },

                        create: {
                            userId: user.id,
                            workspaceId: workspace.id,
                            role: "ADMIN",
                        },
                    });

                console.log(
                    "Workspace member saved:",
                    member.id
                );

                return member;
            }
        );

        console.log("====================================");
        console.log("WORKSPACE SYNC COMPLETED");
        console.log("Workspace:", workspace.id);
        console.log("Member:", member.id);
        console.log("====================================");

        return {
            success: true,
            workspaceId: workspace.id,
            memberId: member.id,
        };
    }
);

// ========================================
// WORKSPACE / ORGANIZATION UPDATED
// ========================================

const syncWorkspaceUpdation = inngest.createFunction(
    {
        id: "sync-workspace-updation-from-clerk",
        triggers: [
            {
                event: "clerk/organization.updated",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        console.log(
            "Inngest: Organization updated",
            data.id
        );

        await prisma.workspace.update({
            where: {
                id: data.id,
            },
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url || "",
            },
        });

        console.log(
            "Workspace updated in database"
        );
    }
);

// ========================================
// WORKSPACE / ORGANIZATION DELETED
// ========================================

const syncWorkspaceDeletion = inngest.createFunction(
    {
        id: "sync-workspace-deletion-from-clerk",
        triggers: [
            {
                event: "clerk/organization.deleted",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        console.log(
            "Inngest: Organization deleted",
            data.id
        );

        await prisma.workspace.deleteMany({
            where: {
                id: data.id,
            },
        });

        console.log(
            "Workspace deleted from database"
        );
    }
);

// ========================================
// WORKSPACE MEMBER CREATED
// ========================================

const syncWorkspaceMemberCreation = inngest.createFunction(
    {
        id: "sync-workspace-member-creation-from-clerk",
        triggers: [
            {
                event: "clerk/organizationMembership.created",
            },
        ],
    },
    async ({ event }) => {
        const { data } = event;

        const userId =
            data.public_user_data?.user_id;

        const organizationId =
            data.organization?.id;

        if (!userId || !organizationId) {
            throw new Error(
                "Missing userId or organizationId in membership created event"
            );
        }

        console.log(
            "Inngest: Organization membership created",
            data.id
        );

        await prisma.workspaceMember.upsert({
            where: {
                userId_workspaceId: {
                    userId: userId,
                    workspaceId: organizationId,
                },
            },

            update: {
                role:
                    data.role === "org:admin"
                        ? "ADMIN"
                        : "MEMBER",
            },

            create: {
                userId: userId,
                workspaceId: organizationId,
                role:
                    data.role === "org:admin"
                        ? "ADMIN"
                        : "MEMBER",
            },
        });

        console.log(
            "Workspace member saved"
        );
    }
);

// ========================================
// WORKSPACE MEMBER UPDATED
// ========================================

const syncWorkspaceMemberUpdation =
    inngest.createFunction(
        {
            id: "sync-workspace-member-updation-from-clerk",
            triggers: [
                {
                    event: "clerk/organizationMembership.updated",
                },
            ],
        },
        async ({ event }) => {
            const { data } = event;

            const userId =
                data.public_user_data?.user_id;

            const organizationId =
                data.organization?.id;

            if (!userId || !organizationId) {
                throw new Error(
                    "Missing userId or organizationId in membership updated event"
                );
            }

            const role =
                data.role === "org:admin"
                    ? "ADMIN"
                    : "MEMBER";

            await prisma.workspaceMember.update({
                where: {
                    userId_workspaceId: {
                        userId: userId,
                        workspaceId: organizationId,
                    },
                },

                data: {
                    role: role,
                },
            });

            console.log(
                "Inngest: Workspace member updated"
            );
        }
    );

// ========================================
// WORKSPACE MEMBER DELETED
// ========================================

const syncWorkspaceMemberDeletion =
    inngest.createFunction(
        {
            id: "sync-workspace-member-deletion-from-clerk",
            triggers: [
                {
                    event: "clerk/organizationMembership.deleted",
                },
            ],
        },
        async ({ event }) => {
            const { data } = event;

            const userId =
                data.public_user_data?.user_id;

            const organizationId =
                data.organization?.id;

            if (!userId || !organizationId) {
                throw new Error(
                    "Missing userId or organizationId in membership deleted event"
                );
            }

            await prisma.workspaceMember.deleteMany({
                where: {
                    userId: userId,
                    workspaceId: organizationId,
                },
            });

            console.log(
                "Inngest: Workspace member deleted"
            );
        }
    );

// ========================================
// EXPORT FUNCTIONS
// ========================================

export const functions = [
    syncUserCreation,
    syncUserUpdation,
    syncUserDeletion,

    syncWorkspaceCreation,
    syncWorkspaceUpdation,
    syncWorkspaceDeletion,

    syncWorkspaceMemberCreation,
    syncWorkspaceMemberUpdation,
    syncWorkspaceMemberDeletion,
];