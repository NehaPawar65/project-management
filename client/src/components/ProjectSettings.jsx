import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import AddProjectMember from "./AddProjectMember";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/react";
import toast from "react-hot-toast";
import { fetchworkspaces } from "../features/workspaceSlice";
import api from "../configs/api";

export default function ProjectSettings({ project }) {
    const dispatch = useDispatch();
    const { getToken } = useAuth();

    /*
     * Get latest workspace from Redux.
     */
    const currentWorkspace = useSelector(
        (state) =>
            state.workspace?.currentWorkspace || null
    );

    /*
     * Find the latest version of this project
     * inside Redux.
     */
    const currentProject =
        currentWorkspace?.projects?.find(
            (p) => p.id === project?.id
        ) || project;

    /*
     * Project form data.
     */
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        progress: 0,
    });

    const [isDialogOpen, setIsDialogOpen] =
        useState(false);

    const [isSubmitting, setIsSubmitting] =
        useState(false);

    /*
     * Update form when project changes.
     */
    useEffect(() => {
        if (!currentProject) {
            return;
        }

        setFormData({
            name: currentProject.name || "",
            description:
                currentProject.description || "",
            status:
                currentProject.status || "PLANNING",
            priority:
                currentProject.priority || "MEDIUM",
            start_date:
                currentProject.start_date || "",
            end_date:
                currentProject.end_date || "",
            progress:
                currentProject.progress || 0,
        });
    }, [currentProject]);

    /*
     * Debug project/member information.
     */
    useEffect(() => {
        console.log(
            "========== PROJECT SETTINGS =========="
        );

        console.log(
            "Project prop:",
            project
        );

        console.log(
            "Redux workspace:",
            currentWorkspace
        );

        console.log(
            "Redux project:",
            currentWorkspace?.projects?.find(
                (p) => p.id === project?.id
            )
        );

        console.log(
            "Current project:",
            currentProject
        );

        console.log(
            "Project members:",
            currentProject?.members
        );

        console.log(
            "Members count:",
            currentProject?.members?.length || 0
        );

        console.log(
            "======================================"
        );
    }, [
        project,
        currentWorkspace,
        currentProject,
    ]);

    /*
     * Save project details.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!currentProject) {
            toast.error("Project not found");
            return;
        }

        setIsSubmitting(true);

        const loadingToast = toast.loading(
            "Saving..."
        );

        try {
            const token = await getToken();

            const { data } = await api.put(
                "/api/projects",
                {
                    ...formData,
                    id: currentProject.id,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            /*
             * Refresh workspace after saving.
             */
            await dispatch(
                fetchworkspaces({ getToken })
            );

            toast.dismiss(loadingToast);

            toast.success(
                data?.message ||
                    "Project updated successfully"
            );
        } catch (error) {
            console.error(
                "Project update error:",
                error
            );

            toast.dismiss(loadingToast);

            toast.error(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error?.message ||
                    "Failed to update project"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClasses =
        "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";

    const cardClasses =
        "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";

    const labelClasses =
        "text-sm text-zinc-600 dark:text-zinc-400";

    /*
     * IMPORTANT:
     * Always use members from currentProject.
     */
    const projectMembers =
        currentProject?.members || [];

    return (
        <div className="grid lg:grid-cols-2 gap-8">

            {/* ================================= */}
            {/* PROJECT DETAILS */}
            {/* ================================= */}

            <div className={cardClasses}>

                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4">
                    Project Details
                </h2>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >

                    {/* Project Name */}
                    <div className="space-y-2">

                        <label
                            className={labelClasses}
                        >
                            Project Name
                        </label>

                        <input
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    name: e.target.value,
                                })
                            }
                            className={inputClasses}
                            required
                        />

                    </div>

                    {/* Description */}
                    <div className="space-y-2">

                        <label
                            className={labelClasses}
                        >
                            Description
                        </label>

                        <textarea
                            value={
                                formData.description
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    description:
                                        e.target.value,
                                })
                            }
                            className={
                                inputClasses +
                                " h-24"
                            }
                        />

                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Status */}
                        <div className="space-y-2">

                            <label
                                className={
                                    labelClasses
                                }
                            >
                                Status
                            </label>

                            <select
                                value={
                                    formData.status
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        status:
                                            e.target.value,
                                    })
                                }
                                className={
                                    inputClasses
                                }
                            >

                                <option value="PLANNING">
                                    Planning
                                </option>

                                <option value="ACTIVE">
                                    Active
                                </option>

                                <option value="ON_HOLD">
                                    On Hold
                                </option>

                                <option value="COMPLETED">
                                    Completed
                                </option>

                                <option value="CANCELLED">
                                    Cancelled
                                </option>

                            </select>

                        </div>

                        {/* Priority */}
                        <div className="space-y-2">

                            <label
                                className={
                                    labelClasses
                                }
                            >
                                Priority
                            </label>

                            <select
                                value={
                                    formData.priority
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        priority:
                                            e.target.value,
                                    })
                                }
                                className={
                                    inputClasses
                                }
                            >

                                <option value="LOW">
                                    Low
                                </option>

                                <option value="MEDIUM">
                                    Medium
                                </option>

                                <option value="HIGH">
                                    High
                                </option>

                            </select>

                        </div>

                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Start Date */}
                        <div className="space-y-2">

                            <label
                                className={
                                    labelClasses
                                }
                            >
                                Start Date
                            </label>

                            <input
                                type="date"
                                value={
                                    formData.start_date
                                        ? format(
                                              new Date(
                                                  formData.start_date
                                              ),
                                              "yyyy-MM-dd"
                                          )
                                        : ""
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        start_date:
                                            e.target.value
                                                ? new Date(
                                                      e.target.value
                                                  )
                                                : "",
                                    })
                                }
                                className={
                                    inputClasses
                                }
                            />

                        </div>

                        {/* End Date */}
                        <div className="space-y-2">

                            <label
                                className={
                                    labelClasses
                                }
                            >
                                End Date
                            </label>

                            <input
                                type="date"
                                value={
                                    formData.end_date
                                        ? format(
                                              new Date(
                                                  formData.end_date
                                              ),
                                              "yyyy-MM-dd"
                                          )
                                        : ""
                                }
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        end_date:
                                            e.target.value
                                                ? new Date(
                                                      e.target.value
                                                  )
                                                : "",
                                    })
                                }
                                className={
                                    inputClasses
                                }
                            />

                        </div>

                    </div>

                    {/* Progress */}
                    <div className="space-y-2">

                        <label
                            className={labelClasses}
                        >
                            Progress:{" "}
                            {formData.progress || 0}%
                        </label>

                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={
                                formData.progress || 0
                            }
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    progress:
                                        Number(
                                            e.target.value
                                        ),
                                })
                            }
                            className="w-full accent-blue-500 dark:accent-blue-400"
                        />

                    </div>

                    {/* Save */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="ml-auto flex items-center text-sm justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    >

                        <Save className="size-4" />

                        {isSubmitting
                            ? "Saving..."
                            : "Save Changes"}

                    </button>

                </form>

            </div>

            {/* ================================= */}
            {/* TEAM MEMBERS */}
            {/* ================================= */}

            <div className="space-y-6">

                <div className={cardClasses}>

                    {/* Header */}
                    <div className="flex items-center justify-between gap-4">

                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300">

                            Team Members{" "}

                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                ({projectMembers.length})
                            </span>

                        </h2>

                        <button
                            type="button"
                            onClick={() =>
                                setIsDialogOpen(
                                    true
                                )
                            }
                            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>

                    </div>

                    {/* Add Member Dialog */}
                    <AddProjectMember
                        isDialogOpen={
                            isDialogOpen
                        }
                        setIsDialogOpen={
                            setIsDialogOpen
                        }
                    />

                    {/* Member List */}
                    {projectMembers.length >
                    0 ? (

                        <div className="space-y-2 mt-4 max-h-48 overflow-y-auto">

                            {projectMembers.map(
                                (
                                    member,
                                    index
                                ) => {

                                    const user =
                                        member?.user ||
                                        member;

                                    const email =
                                        user?.email ||
                                        member?.email ||
                                        "Unknown";

                                    const userId =
                                        user?.id ||
                                        member?.userId ||
                                        member?.id ||
                                        index;

                                    const isTeamLead =
                                        currentProject?.team_lead ===
                                        user?.id;

                                    return (
                                        <div
                                            key={
                                                userId
                                            }
                                            className="flex items-center justify-between px-3 py-2 rounded dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-300"
                                        >

                                            <span>
                                                {
                                                    email
                                                }
                                            </span>

                                            {isTeamLead && (
                                                <span className="px-2 py-0.5 rounded-xs ring ring-zinc-200 dark:ring-zinc-600">
                                                    Team Lead
                                                </span>
                                            )}

                                        </div>
                                    );
                                }
                            )}

                        </div>

                    ) : (

                        <div className="mt-4">

                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                No project members found.
                            </p>

                        </div>

                    )}

                </div>

            </div>

        </div>
    );
}