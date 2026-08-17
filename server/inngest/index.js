import { Inngest } from "inngest";
import { prisma } from "../config/prisma.js";
import sendEmail from "../config/nodemailer.js";

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
        triggers: {
            event: "clerk/user.created",
        },
    },
    async ({ event }) => {
        const { data } = event;

        console.log("====================================");
        console.log("INNGEST: USER CREATED");
        console.log("User ID:", data.id);
        console.log(
            "Email:",
            data?.email_addresses?.[0]?.email_address
        );
        console.log("====================================");

        const email =
            data?.email_addresses?.[0]?.email_address || "";

        const name =
            `${data?.first_name || ""} ${data?.last_name || ""}`.trim();

        await prisma.user.upsert({
            where: {
                id: data.id,
            },

            update: {
                email,
                name,
                image: data?.image_url || "",
            },

            create: {
                id: data.id,
                email,
                name,
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
        triggers: {
            event: "clerk/user.updated",
        },
    },
    async ({ event }) => {
        const { data } = event;

        console.log(
            "Inngest: User updated",
            data.id
        );

        const email =
            data?.email_addresses?.[0]?.email_address || "";

        const name =
            `${data?.first_name || ""} ${data?.last_name || ""}`.trim();

        await prisma.user.upsert({
            where: {
                id: data.id,
            },

            update: {
                email,
                name,
                image: data?.image_url || "",
            },

            create: {
                id: data.id,
                email,
                name,
                image: data?.image_url || "",
            },
        });

        console.log(
            "Inngest: User updated in database"
        );
    }
);

// ========================================
// USER DELETED
// ========================================

const syncUserDeletion = inngest.createFunction(
    {
        id: "sync-user-deletion-from-clerk",
        triggers: {
            event: "clerk/user.deleted",
        },
    },
    async ({ event }) => {
        const { data } = event;

        console.log(
            "Inngest: User deleted",
            data.id
        );

        await prisma.user.deleteMany({
            where: {
                id: data.id,
            },
        });

        console.log(
            "Inngest: User deleted from database"
        );
    }
);

// ========================================
// ORGANIZATION CREATED
// ========================================

const syncWorkspaceCreation = inngest.createFunction(
    {
        id: "sync-workspace-creation-from-clerk",
        triggers: {
            event: "clerk/organization.created",
        },
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

        // STEP 1: FIND OWNER

        const user = await step.run(
            "find-organization-owner",
            async () => {
                const existingUser =
                    await prisma.user.findUnique({
                        where: {
                            id: data.created_by,
                        },
                    });

                if (!existingUser) {
                    throw new Error(
                        `User ${data.created_by} does not exist in Neon`
                    );
                }

                console.log(
                    "Organization owner found:",
                    existingUser.id
                );

                return existingUser;
            }
        );

        // STEP 2: CREATE / UPDATE WORKSPACE

        const workspace = await step.run(
            "sync-workspace",
            async () => {
                const savedWorkspace =
                    await prisma.workspace.upsert({
                        where: {
                            id: data.id,
                        },

                        update: {
                            name: data.name,
                            slug: data.slug,
                            image_url:
                                data.image_url || "",

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
                            image_url:
                                data.image_url || "",

                            owner: {
                                connect: {
                                    id: user.id,
                                },
                            },
                        },
                    });

                console.log(
                    "Workspace saved:",
                    savedWorkspace.id
                );

                return savedWorkspace;
            }
        );

        // STEP 3: ADD OWNER AS ADMIN

        const member = await step.run(
            "sync-workspace-owner",
            async () => {
                const workspaceMember =
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
                    "Workspace owner member saved:",
                    workspaceMember.id
                );

                return workspaceMember;
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
// ORGANIZATION UPDATED
// ========================================

const syncWorkspaceUpdation = inngest.createFunction(
    {
        id: "sync-workspace-updation-from-clerk",
        triggers: {
            event: "clerk/organization.updated",
        },
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
            "Inngest: Workspace updated"
        );
    }
);

// ========================================
// ORGANIZATION DELETED
// ========================================

const syncWorkspaceDeletion = inngest.createFunction(
    {
        id: "sync-workspace-deletion-from-clerk",
        triggers: {
            event: "clerk/organization.deleted",
        },
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
            "Inngest: Workspace deleted"
        );
    }
);

// ========================================
// ORGANIZATION MEMBER CREATED
// ========================================

const syncWorkspaceMemberCreation =
    inngest.createFunction(
        {
            id: "sync-workspace-member-creation-from-clerk",

            triggers: {
                event:
                    "clerk/organizationMembership.created",
            },
        },

        async ({ event, step }) => {
            const { data } = event;

            console.log("====================================");
            console.log(
                "ORGANIZATION MEMBER CREATED"
            );
            console.log("Membership ID:", data.id);
            console.log(
                "Organization:",
                data.organization?.id
            );
            console.log(
                "User:",
                data.public_user_data?.user_id
            );
            console.log(
                "Role:",
                data.role
            );
            console.log("====================================");

            const userId =
                data.public_user_data?.user_id;

            const organizationId =
                data.organization?.id;

            if (!userId) {
                throw new Error(
                    "User ID missing from organization membership event"
                );
            }

            if (!organizationId) {
                throw new Error(
                    "Organization ID missing from organization membership event"
                );
            }

            // STEP 1: FIND USER

            const user = await step.run(
                "find-member-user",
                async () => {
                    const existingUser =
                        await prisma.user.findUnique({
                            where: {
                                id: userId,
                            },
                        });

                    if (!existingUser) {
                        throw new Error(
                            `User ${userId} does not exist in Neon yet`
                        );
                    }

                    console.log(
                        "Member user found:",
                        existingUser.id
                    );

                    return existingUser;
                }
            );

            // STEP 2: FIND WORKSPACE

            const workspace = await step.run(
                "find-member-workspace",
                async () => {
                    const existingWorkspace =
                        await prisma.workspace.findUnique({
                            where: {
                                id: organizationId,
                            },
                        });

                    if (!existingWorkspace) {
                        throw new Error(
                            `Workspace ${organizationId} does not exist in Neon yet`
                        );
                    }

                    console.log(
                        "Workspace found:",
                        existingWorkspace.id
                    );

                    return existingWorkspace;
                }
            );

            // STEP 3: CREATE MEMBER

            const role =
                data.role === "org:admin"
                    ? "ADMIN"
                    : "MEMBER";

            const member = await step.run(
                "sync-workspace-member",
                async () => {
                    const workspaceMember =
                        await prisma.workspaceMember.upsert({
                            where: {
                                userId_workspaceId: {
                                    userId: user.id,
                                    workspaceId:
                                        workspace.id,
                                },
                            },

                            update: {
                                role,
                            },

                            create: {
                                userId: user.id,
                                workspaceId:
                                    workspace.id,
                                role,
                            },
                        });

                    console.log(
                        "Workspace member saved:",
                        workspaceMember.id
                    );

                    return workspaceMember;
                }
            );

            console.log("====================================");
            console.log(
                "MEMBER SYNC COMPLETED"
            );
            console.log(
                "User:",
                user.id
            );
            console.log(
                "Workspace:",
                workspace.id
            );
            console.log(
                "Member:",
                member.id
            );
            console.log("====================================");

            return {
                success: true,
                userId: user.id,
                workspaceId: workspace.id,
                memberId: member.id,
            };
        }
    );

// ========================================
// ORGANIZATION MEMBER UPDATED
// ========================================

const syncWorkspaceMemberUpdation =
    inngest.createFunction(
        {
            id:
                "sync-workspace-member-updation-from-clerk",

            triggers: {
                event:
                    "clerk/organizationMembership.updated",
            },
        },

        async ({ event }) => {
            const { data } = event;

            const userId =
                data.public_user_data?.user_id;

            const organizationId =
                data.organization?.id;

            if (!userId || !organizationId) {
                throw new Error(
                    "Missing userId or organizationId"
                );
            }

            const role =
                data.role === "org:admin"
                    ? "ADMIN"
                    : "MEMBER";

            await prisma.workspaceMember.update({
                where: {
                    userId_workspaceId: {
                        userId,
                        workspaceId:
                            organizationId,
                    },
                },

                data: {
                    role,
                },
            });

            console.log(
                "Inngest: Workspace member updated"
            );
        }
    );

// ========================================
// ORGANIZATION MEMBER DELETED
// ========================================

const syncWorkspaceMemberDeletion =
    inngest.createFunction(
        {
            id:
                "sync-workspace-member-deletion-from-clerk",

            triggers: {
                event:
                    "clerk/organizationMembership.deleted",
            },
        },

        async ({ event }) => {
            const { data } = event;

            const userId =
                data.public_user_data?.user_id;

            const organizationId =
                data.organization?.id;

            if (!userId || !organizationId) {
                throw new Error(
                    "Missing userId or organizationId"
                );
            }

            await prisma.workspaceMember.deleteMany({
                where: {
                    userId,
                    workspaceId:
                        organizationId,
                },
            });

            console.log(
                "Inngest: Workspace member deleted"
            );
        }
    );

// ========================================
// SEND TASK ASSIGNMENT EMAIL
// ========================================

const sendTaskAssignmentEmail =
    inngest.createFunction(
        {
            id: "send-task-assignment-email",

            triggers: {
                event: "app/task.assigned",
            },
        },

        async ({ event, step }) => {
            console.log("====================================");
            console.log("🚀 TASK ASSIGNMENT EVENT RECEIVED");
            console.log("Event:", event);
            console.log("====================================");

            const {
                taskId,
                origin,
            } = event.data;

            if (!taskId) {
                throw new Error(
                    "Task ID missing from task.assigned event"
                );
            }

            // ========================================
            // FIND TASK
            // ========================================

            const task = await step.run(
                "find-task-for-assignment-email",
                async () => {
                    const foundTask =
                        await prisma.task.findUnique({
                            where: {
                                id: taskId,
                            },

                            include: {
                                assignee: true,
                                project: true,
                            },
                        });

                    if (!foundTask) {
                        throw new Error(
                            `Task ${taskId} not found`
                        );
                    }

                    if (!foundTask.assignee) {
                        throw new Error(
                            `Task ${taskId} does not have an assignee`
                        );
                    }

                    if (!foundTask.assignee.email) {
                        throw new Error(
                            `Assignee ${foundTask.assignee.id} does not have an email`
                        );
                    }

                    if (!foundTask.project) {
                        throw new Error(
                            `Task ${taskId} does not have a project`
                        );
                    }

                    console.log("====================================");
                    console.log("TASK FOUND");
                    console.log("Task ID:", foundTask.id);
                    console.log("Task Title:", foundTask.title);
                    console.log(
                        "Assignee ID:",
                        foundTask.assigneeId
                    );
                    console.log(
                        "Assignee Name:",
                        foundTask.assignee.name
                    );
                    console.log(
                        "Assignee Email:",
                        foundTask.assignee.email
                    );
                    console.log(
                        "Project:",
                        foundTask.project.name
                    );
                    console.log("====================================");

                    return foundTask;
                }
            );

            // ========================================
            // SEND ASSIGNMENT EMAIL
            // ========================================

            await step.run(
                "send-task-assignment-email",
                async () => {
                    console.log(
                        "📧 ABOUT TO SEND TASK ASSIGNMENT EMAIL"
                    );

                    await sendEmail({
                        to: task.assignee.email,

                        subject:
                            `New Task Assignment in ${task.project.name}`,

                        body: `
                            <div style="
                                max-width: 600px;
                                margin: 0 auto;
                                font-family: Arial, sans-serif;
                                padding: 20px;
                            ">

                                <h2>
                                    Hi ${task.assignee.name || "there"},
                                </h2>

                                <p style="font-size: 16px;">
                                    You've been assigned a new task:
                                </p>

                                <p style="
                                    font-size: 18px;
                                    font-weight: bold;
                                    color: #007bff;
                                    margin: 8px 0;
                                ">
                                    ${task.title}
                                </p>

                                <div style="
                                    border: 1px solid #ddd;
                                    padding: 12px 16px;
                                    border-radius: 6px;
                                    margin-bottom: 30px;
                                ">

                                    <p style="margin: 6px 0;">
                                        <strong>Description:</strong>
                                        ${task.description || "No description"}
                                    </p>

                                    <p style="margin: 6px 0;">
                                        <strong>Due Date:</strong>
                                        ${
                                            task.due_date
                                                ? new Date(
                                                      task.due_date
                                                  ).toLocaleDateString()
                                                : "No due date"
                                        }
                                    </p>

                                    <p style="margin: 6px 0;">
                                        <strong>Priority:</strong>
                                        ${task.priority || "Not specified"}
                                    </p>

                                    <p style="margin: 6px 0;">
                                        <strong>Status:</strong>
                                        ${task.status || "Not specified"}
                                    </p>

                                </div>

                                <a
                                    href="${
                                        origin ||
                                        "http://localhost:5173"
                                    }"
                                    style="
                                        background-color: #007bff;
                                        padding: 12px 24px;
                                        border-radius: 5px;
                                        color: #fff;
                                        font-weight: 600;
                                        font-size: 16px;
                                        text-decoration: none;
                                        display: inline-block;
                                    "
                                >
                                    View Task
                                </a>

                                <p style="
                                    margin-top: 20px;
                                    font-size: 14px;
                                    color: #6c757d;
                                ">
                                    Please make sure to review and
                                    complete it before the due date.
                                </p>

                            </div>
                        `,
                    });

                    console.log(
                        "✅ TASK ASSIGNMENT EMAIL SENT"
                    );
                }
            );

            // ========================================
            // WAIT UNTIL DUE DATE
            // ========================================

            if (
                task.due_date &&
                new Date(task.due_date) > new Date()
            ) {
                await step.sleepUntil(
                    "wait-for-the-due-date",
                    new Date(task.due_date)
                );

                // ========================================
                // CHECK TASK STATUS
                // ========================================

                await step.run(
                    "check-if-task-is-completed",
                    async () => {
                        const updatedTask =
                            await prisma.task.findUnique({
                                where: {
                                    id: taskId,
                                },

                                include: {
                                    assignee: true,
                                    project: true,
                                },
                            });

                        if (!updatedTask) {
                            console.log(
                                "Task no longer exists"
                            );

                            return;
                        }

                        if (!updatedTask.assignee) {
                            console.log(
                                "Task no longer has an assignee"
                            );

                            return;
                        }

                        if (
                            updatedTask.status !== "Done"
                        ) {
                            console.log(
                                "Sending overdue task reminder"
                            );

                            await sendEmail({
                                to:
                                    updatedTask.assignee.email,

                                subject:
                                    `Reminder for ${updatedTask.project.name}`,

                                body: `
                                    <div style="
                                        max-width: 600px;
                                        margin: 0 auto;
                                        font-family: Arial, sans-serif;
                                        padding: 20px;
                                    ">

                                        <h2>
                                            Hi ${
                                                updatedTask
                                                    .assignee
                                                    .name ||
                                                "there"
                                            },
                                        </h2>

                                        <p style="font-size: 16px;">
                                            This is a reminder that your
                                            task is still pending:
                                        </p>

                                        <p style="
                                            font-size: 18px;
                                            font-weight: bold;
                                            color: #007bff;
                                            margin: 8px 0;
                                        ">
                                            ${updatedTask.title}
                                        </p>

                                        <div style="
                                            border: 1px solid #ddd;
                                            padding: 12px 16px;
                                            border-radius: 6px;
                                            margin-bottom: 30px;
                                        ">

                                            <p style="margin: 6px 0;">
                                                <strong>Description:</strong>
                                                ${
                                                    updatedTask.description ||
                                                    "No description"
                                                }
                                            </p>

                                            <p style="margin: 6px 0;">
                                                <strong>Due Date:</strong>
                                                ${
                                                    updatedTask.due_date
                                                        ? new Date(
                                                              updatedTask.due_date
                                                          ).toLocaleDateString()
                                                        : "No due date"
                                                }
                                            </p>

                                        </div>

                                        <a
                                            href="${
                                                origin ||
                                                "http://localhost:5173"
                                            }"
                                            style="
                                                background-color: #007bff;
                                                padding: 12px 24px;
                                                border-radius: 5px;
                                                color: #fff;
                                                font-weight: 600;
                                                font-size: 16px;
                                                text-decoration: none;
                                                display: inline-block;
                                            "
                                        >
                                            View Task
                                        </a>

                                        <p style="
                                            margin-top: 20px;
                                            font-size: 14px;
                                            color: #6c757d;
                                        ">
                                            Please make sure to complete
                                            the task.
                                        </p>

                                    </div>
                                `,
                            });

                            console.log(
                                "✅ OVERDUE REMINDER EMAIL SENT"
                            );
                        }
                    }
                );
            }

            return {
                success: true,
                taskId,
                email: task.assignee.email,
            };
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

    sendTaskAssignmentEmail,
];