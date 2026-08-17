import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { fetchworkspaces } from "../features/workspaceSlice";
import api from "../configs/api";
import { useAuth } from "@clerk/react";

const AddProjectMember = ({
    isDialogOpen,
    setIsDialogOpen,
}) => {
    const [searchParams] = useSearchParams();

    const id = searchParams.get("id");

    const { getToken } = useAuth();

    const dispatch = useDispatch();

    const currentWorkspace = useSelector(
        (state) =>
            state.workspace?.currentWorkspace || null
    );

    /*
     * Get the latest project from Redux.
     */
    const project =
        currentWorkspace?.projects?.find(
            (p) => p.id === id
        ) || null;

    /*
     * Existing project members.
     */
    const projectMembers =
        project?.members || [];

    const projectMembersEmails =
        projectMembers
            .map(
                (member) =>
                    member?.user?.email ||
                    member?.email
            )
            .filter(Boolean);

    const [email, setEmail] = useState("");

    const [isAdding, setIsAdding] =
        useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentWorkspace) {
            toast.error(
                "Workspace is not available"
            );
            return;
        }

        if (!project) {
            toast.error(
                "Project not found"
            );
            return;
        }

        if (!email) {
            toast.error(
                "Please select a member"
            );
            return;
        }

        /*
         * Prevent duplicate submission on frontend
         * if Redux already knows about the member.
         */
        if (
            projectMembersEmails.includes(
                email
            )
        ) {
            toast.error(
                "This member is already in the project"
            );
            return;
        }

        setIsAdding(true);

        try {
            const token =
                await getToken();

            console.log(
                "========== ADD PROJECT MEMBER =========="
            );

            console.log(
                "Workspace:",
                currentWorkspace.id
            );

            console.log(
                "Project:",
                project.id
            );

            console.log(
                "Email:",
                email
            );

            console.log(
                "Current project members:",
                projectMembers
            );

            const response =
                await api.post(
                    `/api/projects/${project.id}/addMember`,
                    {
                        email,
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            console.log(
                "Add member response:",
                response.data
            );

            /*
             * IMPORTANT:
             * Refresh Redux after successful backend insertion.
             */
            const refreshResult =
                await dispatch(
                    fetchworkspaces({
                        getToken,
                    })
                );

            console.log(
                "Workspace refresh result:",
                refreshResult
            );

            toast.success(
                response?.data?.message ||
                    "Added to project successfully"
            );

            setEmail("");

            setIsDialogOpen(false);

            console.log(
                "========================================"
            );
        } catch (error) {
            console.error(
                "========== ADD PROJECT MEMBER ERROR =========="
            );

            console.error(
                "Error:",
                error
            );

            console.error(
                "Response:",
                error?.response?.data
            );

            console.error(
                "Status:",
                error?.response?.status
            );

            console.error(
                "=============================================="
            );

            toast.error(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error?.message ||
                    "Failed to add member"
            );
        } finally {
            setIsAdding(false);
        }
    };

    if (!isDialogOpen) {
        return null;
    }

    /*
     * Workspace members who are NOT already
     * project members.
     */
    const availableMembers =
        currentWorkspace?.members?.filter(
            (member) => {
                const memberEmail =
                    member?.user?.email ||
                    member?.email;

                return (
                    memberEmail &&
                    !projectMembersEmails.includes(
                        memberEmail
                    )
                );
            }
        ) || [];

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">

            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">

                {/* Header */}
                <div className="mb-4">

                    <h2 className="text-xl font-bold flex items-center gap-2">

                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" />

                        Add Member to Project

                    </h2>

                    {currentWorkspace &&
                        project && (
                            <p className="text-sm text-zinc-700 dark:text-zinc-400">

                                Adding to Project:{" "}

                                <span className="text-blue-600 dark:text-blue-400">
                                    {project.name}
                                </span>

                            </p>
                        )}

                </div>

                {/* Project not found */}
                {!project ? (

                    <div className="py-4">

                        <p className="text-sm text-red-500">
                            Project not found. Please go
                            back and select a project.
                        </p>

                        <div className="flex justify-end pt-4">

                            <button
                                type="button"
                                onClick={() =>
                                    setIsDialogOpen(
                                        false
                                    )
                                }
                                className="px-5 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                            >
                                Close
                            </button>

                        </div>

                    </div>

                ) : (

                    <form
                        onSubmit={
                            handleSubmit
                        }
                        className="space-y-4"
                    >

                        {/* Email */}
                        <div className="space-y-2">

                            <label
                                htmlFor="project-member-email"
                                className="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                            >
                                Email Address
                            </label>

                            <div className="relative">

                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />

                                <select
                                    id="project-member-email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    className="pl-10 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm py-2 focus:outline-none focus:border-blue-500"
                                    required
                                >

                                    <option value="">
                                        Select a member
                                    </option>

                                    {availableMembers.map(
                                        (
                                            member
                                        ) => {

                                            const user =
                                                member?.user ||
                                                member;

                                            const memberEmail =
                                                user?.email;

                                            const memberId =
                                                user?.id ||
                                                member?.id;

                                            return (
                                                <option
                                                    key={
                                                        memberId ||
                                                        memberEmail
                                                    }
                                                    value={
                                                        memberEmail
                                                    }
                                                >
                                                    {
                                                        memberEmail
                                                    }
                                                </option>
                                            );
                                        }
                                    )}

                                </select>

                            </div>

                            {availableMembers.length ===
                                0 && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    All workspace members
                                    are already in this
                                    project.
                                </p>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-3 pt-2">

                            <button
                                type="button"
                                onClick={() => {
                                    setEmail("");

                                    setIsDialogOpen(
                                        false
                                    );
                                }}
                                className="px-5 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    isAdding ||
                                    !currentWorkspace ||
                                    !project ||
                                    !email
                                }
                                className="px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 hover:opacity-90 text-white disabled:opacity-50 transition"
                            >
                                {isAdding
                                    ? "Adding..."
                                    : "Add Member"}
                            </button>

                        </div>

                    </form>
                )}

            </div>

        </div>
    );
};

export default AddProjectMember;