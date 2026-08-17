import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSelector } from "react-redux";
import { useOrganization } from "@clerk/react";
import toast from "react-hot-toast";

const InviteMemberDialog = ({
    isDialogOpen,
    setIsDialogOpen,
}) => {
    const {
        organization,
        isLoaded,
    } = useOrganization();

    const currentWorkspace = useSelector(
        (state) => state.workspace?.currentWorkspace || null
    );

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        role: "org:member",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isLoaded) {
            toast.error("Clerk is still loading. Please try again.");
            return;
        }

        if (!organization) {
            console.error(
                "Clerk organization is not available"
            );

            toast.error(
                "No Clerk organization is selected."
            );

            return;
        }

        if (!currentWorkspace) {
            toast.error(
                "Workspace is not available."
            );

            return;
        }

        if (!formData.email.trim()) {
            toast.error(
                "Please enter an email address."
            );

            return;
        }

        setIsSubmitting(true);

        try {
            console.log(
                "========== INVITATION START =========="
            );

            console.log(
                "Organization ID:",
                organization.id
            );

            console.log(
                "Organization name:",
                organization.name
            );

            console.log(
                "Workspace:",
                currentWorkspace.name
            );

            console.log(
                "Email:",
                formData.email
            );

            console.log(
                "Role:",
                formData.role
            );

            // Create the invitation ONCE
            const invitation =
                await organization.inviteMember({
                    emailAddress: formData.email.trim(),
                    role: formData.role,
                });

            // Invitation information
            console.log(
                "========== CLERK INVITATION =========="
            );

            console.log(
                "Invitation object:",
                invitation
            );

            console.log(
                "Invitation ID:",
                invitation?.id
            );

            console.log(
                "Invitation email:",
                invitation?.emailAddress
            );

            console.log(
                "Invitation status:",
                invitation?.status
            );

            console.log(
                "Invitation URL:",
                invitation?.url
            );

            console.log(
                "Invitation created at:",
                invitation?.createdAt
            );

            console.log(
                "======================================="
            );

            toast.success(
                "Invitation sent successfully!"
            );

            // Reset form
            setFormData({
                email: "",
                role: "org:member",
            });

            // Close dialog
            setIsDialogOpen(false);

        } catch (error) {
            console.error(
                "========== INVITATION ERROR =========="
            );

            console.error(
                "Full error:",
                error
            );

            console.error(
                "Error message:",
                error?.message
            );

            console.error(
                "Clerk errors:",
                error?.errors
            );

            console.error(
                "Error JSON:",
                JSON.stringify(
                    error,
                    null,
                    2
                )
            );

            const message =
                error?.errors?.[0]?.longMessage ||
                error?.errors?.[0]?.message ||
                error?.message ||
                "Failed to send invitation";

            toast.error(message);

        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }

        setFormData({
            email: "",
            role: "org:member",
        });

        setIsDialogOpen(false);
    };

    if (!isDialogOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50">

            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200">

                {/* Header */}
                <div className="mb-4">

                    <h2 className="text-xl font-bold flex items-center gap-2">

                        <UserPlus className="size-5 text-zinc-900 dark:text-zinc-200" />

                        Invite Team Member

                    </h2>

                    {currentWorkspace && (
                        <p className="text-sm text-zinc-700 dark:text-zinc-400">

                            Inviting to workspace:{" "}

                            <span className="text-blue-600 dark:text-blue-400">

                                {currentWorkspace.name}

                            </span>

                        </p>
                    )}

                </div>

                {/* Clerk Loading */}
                {!isLoaded ? (

                    <div className="py-6">

                        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">

                            Loading organization...

                        </p>

                    </div>

                ) : !organization ? (

                    /* Organization unavailable */

                    <div className="py-4">

                        <p className="text-sm text-red-500">

                            No Clerk organization is currently selected.

                        </p>

                        <div className="flex justify-end pt-4">

                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            >
                                Close
                            </button>

                        </div>

                    </div>

                ) : (

                    /* Form */

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >

                        {/* Email */}

                        <div className="space-y-2">

                            <label
                                htmlFor="invite-email"
                                className="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                            >
                                Email Address
                            </label>

                            <div className="relative">

                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 w-4 h-4" />

                                <input
                                    id="invite-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    placeholder="Enter email address"
                                    className="pl-10 mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                    required
                                    disabled={isSubmitting}
                                />

                            </div>

                        </div>

                        {/* Role */}

                        <div className="space-y-2">

                            <label
                                htmlFor="invite-role"
                                className="text-sm font-medium text-zinc-900 dark:text-zinc-200"
                            >
                                Role
                            </label>

                            <select
                                id="invite-role"
                                value={formData.role}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        role: e.target.value,
                                    })
                                }
                                disabled={isSubmitting}
                                className="w-full rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 py-2 px-3 mt-1 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50"
                            >

                                <option value="org:member">
                                    Member
                                </option>

                                <option value="org:admin">
                                    Admin
                                </option>

                            </select>

                        </div>

                        {/* Footer */}

                        <div className="flex justify-end gap-3 pt-2">

                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSubmitting}
                                className="px-5 py-2 rounded text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !isLoaded ||
                                    !organization ||
                                    !currentWorkspace ||
                                    !formData.email.trim()
                                }
                                className="px-5 py-2 rounded text-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white disabled:opacity-50 hover:opacity-90 transition"
                            >
                                {isSubmitting
                                    ? "Sending..."
                                    : "Send Invitation"}
                            </button>

                        </div>

                    </form>
                )}

            </div>

        </div>
    );
};

export default InviteMemberDialog;