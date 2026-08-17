import { format } from "date-fns";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import {
    deleteTask,
    updateTask,
} from "../features/workspaceSlice";
import {
    Bug,
    CalendarIcon,
    GitCommit,
    MessageSquare,
    Square,
    Trash,
    XIcon,
    Zap,
} from "lucide-react";
import api from "../configs/api";

// ==========================================
// TASK TYPE ICONS
// ==========================================

const typeIcons = {
    BUG: {
        icon: Bug,
        color: "text-red-600 dark:text-red-400",
    },

    FEATURE: {
        icon: Zap,
        color: "text-blue-600 dark:text-blue-400",
    },

    TASK: {
        icon: Square,
        color: "text-green-600 dark:text-green-400",
    },

    IMPROVEMENT: {
        icon: GitCommit,
        color: "text-purple-600 dark:text-purple-400",
    },

    OTHER: {
        icon: MessageSquare,
        color: "text-amber-600 dark:text-amber-400",
    },
};

// ==========================================
// PRIORITY COLORS
// ==========================================

const priorityTexts = {
    LOW: {
        background: "bg-red-100 dark:bg-red-950",
        prioritycolor: "text-red-600 dark:text-red-400",
    },

    MEDIUM: {
        background: "bg-blue-100 dark:bg-blue-950",
        prioritycolor: "text-blue-600 dark:text-blue-400",
    },

    HIGH: {
        background: "bg-emerald-100 dark:bg-emerald-950",
        prioritycolor: "text-emerald-600 dark:text-emerald-400",
    },
};

// ==========================================
// COMPONENT
// ==========================================

const ProjectTasks = ({ tasks = [] }) => {
    const { getToken } = useAuth();

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [selectedTasks, setSelectedTasks] = useState([]);

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    // ==========================================
    // ASSIGNEE LIST
    // ==========================================

    const assigneeList = useMemo(() => {
        return Array.from(
            new Set(
                tasks
                    .map((task) => task.assignee?.name)
                    .filter(Boolean)
            )
        );
    }, [tasks]);

    // ==========================================
    // FILTER TASKS
    // ==========================================

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const {
                status,
                type,
                priority,
                assignee,
            } = filters;

            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee ||
                    task.assignee?.name === assignee)
            );
        });
    }, [filters, tasks]);

    // ==========================================
    // FILTER CHANGE
    // ==========================================

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // ==========================================
    // STATUS UPDATE
    // ==========================================

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");

            const token = await getToken();

            await api.put(
                `/api/tasks/${taskId}`,
                {
                    status: newStatus,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const existingTask = tasks.find(
                (task) => task.id === taskId
            );

            if (existingTask) {
                const updatedTask = {
                    ...existingTask,
                    status: newStatus,
                };

                dispatch(updateTask(updatedTask));
            }

            toast.dismiss();
            toast.success(
                "Task status updated successfully"
            );
        } catch (error) {
            toast.dismiss();

            console.error(
                "Update task status error:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    "Failed to update task status"
            );
        }
    };

    // ==========================================
    // DELETE SELECTED TASKS
    // ==========================================

    const handleDelete = async () => {
        if (selectedTasks.length === 0) {
            toast.error("Please select at least one task");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to delete the selected tasks?"
        );

        if (!confirmed) return;

        try {
            toast.loading("Deleting tasks...");

            const token = await getToken();

            await api.post(
                "/api/tasks/delete",
                {
                    taskIds: selectedTasks,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            dispatch(deleteTask(selectedTasks));

            setSelectedTasks([]);

            toast.dismiss();
            toast.success(
                "Tasks deleted successfully"
            );
        } catch (error) {
            toast.dismiss();

            console.error(
                "Delete tasks error:",
                error
            );

            toast.error(
                error?.response?.data?.message ||
                    error?.message ||
                    "Failed to delete tasks"
            );
        }
    };

    // ==========================================
    // SELECT / UNSELECT TASK
    // ==========================================

    const handleTaskSelection = (taskId) => {
        setSelectedTasks((prev) => {
            if (prev.includes(taskId)) {
                return prev.filter(
                    (id) => id !== taskId
                );
            }

            return [...prev, taskId];
        });
    };

    // ==========================================
    // SELECT ALL TASKS
    // ==========================================

    const handleSelectAll = () => {
        if (selectedTasks.length === tasks.length) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(
                tasks.map((task) => task.id)
            );
        }
    };

    // ==========================================
    // NAVIGATE TO TASK DETAILS
    // ==========================================

    const handleTaskClick = (task) => {
        navigate(
            `/taskDetails?projectId=${task.projectId}&taskId=${task.id}`
        );
    };

    // ==========================================
    // FILTER OPTIONS
    // ==========================================

    const filterOptions = {
        status: [
            {
                label: "All Statuses",
                value: "",
            },
            {
                label: "To Do",
                value: "TODO",
            },
            {
                label: "In Progress",
                value: "IN_PROGRESS",
            },
            {
                label: "Done",
                value: "DONE",
            },
        ],

        type: [
            {
                label: "All Types",
                value: "",
            },
            {
                label: "Task",
                value: "TASK",
            },
            {
                label: "Bug",
                value: "BUG",
            },
            {
                label: "Feature",
                value: "FEATURE",
            },
            {
                label: "Improvement",
                value: "IMPROVEMENT",
            },
            {
                label: "Other",
                value: "OTHER",
            },
        ],

        priority: [
            {
                label: "All Priorities",
                value: "",
            },
            {
                label: "Low",
                value: "LOW",
            },
            {
                label: "Medium",
                value: "MEDIUM",
            },
            {
                label: "High",
                value: "HIGH",
            },
        ],

        assignee: [
            {
                label: "All Assignees",
                value: "",
            },

            ...assigneeList.map((name) => ({
                label: name,
                value: name,
            })),
        ],
    };

    // ==========================================
    // RETURN
    // ==========================================

    return (
        <div>
            {/* ==========================================
                FILTERS
            ========================================== */}

            <div className="flex flex-wrap gap-4 mb-4">
                {[
                    "status",
                    "type",
                    "priority",
                    "assignee",
                ].map((name) => (
                    <select
                        key={name}
                        name={name}
                        value={filters[name]}
                        onChange={handleFilterChange}
                        className="border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 outline-none px-3 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200"
                    >
                        {filterOptions[name].map(
                            (option) => (
                                <option
                                    key={`${name}-${option.value}`}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            )
                        )}
                    </select>
                ))}

                {/* RESET FILTERS */}

                {(filters.status ||
                    filters.type ||
                    filters.priority ||
                    filters.assignee) && (
                    <button
                        type="button"
                        onClick={() =>
                            setFilters({
                                status: "",
                                type: "",
                                priority: "",
                                assignee: "",
                            })
                        }
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-purple-400 to-purple-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
                    >
                        <XIcon className="size-3" />
                        Reset
                    </button>
                )}

                {/* DELETE */}

                {selectedTasks.length > 0 && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="px-3 py-1 flex items-center gap-2 rounded bg-gradient-to-br from-indigo-400 to-indigo-500 text-zinc-100 dark:text-zinc-200 text-sm transition-colors"
                    >
                        <Trash className="size-3" />
                        Delete
                    </button>
                )}
            </div>

            {/* ==========================================
                TASKS TABLE
            ========================================== */}

            <div className="overflow-auto rounded-lg lg:border border-zinc-300 dark:border-zinc-800">
                <div className="w-full">

                    {/* ==========================================
                        DESKTOP VIEW
                    ========================================== */}

                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left bg-white dark:bg-transparent text-zinc-900 dark:text-zinc-300">

                            <thead className="text-xs uppercase dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400">
                                <tr>

                                    <th className="pl-2 pr-1">
                                        <input
                                            type="checkbox"
                                            checked={
                                                tasks.length > 0 &&
                                                selectedTasks.length ===
                                                    tasks.length
                                            }
                                            onChange={
                                                handleSelectAll
                                            }
                                            className="size-3 accent-zinc-600 dark:accent-zinc-500"
                                        />
                                    </th>

                                    <th className="px-4 pl-0 py-3">
                                        Title
                                    </th>

                                    <th className="px-4 py-3">
                                        Type
                                    </th>

                                    <th className="px-4 py-3">
                                        Priority
                                    </th>

                                    <th className="px-4 py-3">
                                        Status
                                    </th>

                                    <th className="px-4 py-3">
                                        Assignee
                                    </th>

                                    <th className="px-4 py-3">
                                        Due Date
                                    </th>

                                </tr>
                            </thead>

                            <tbody>
                                {filteredTasks.length >
                                0 ? (
                                    filteredTasks.map(
                                        (task) => {
                                            const {
                                                icon: Icon,
                                                color,
                                            } =
                                                typeIcons[
                                                    task.type
                                                ] || {};

                                            const {
                                                background,
                                                prioritycolor,
                                            } =
                                                priorityTexts[
                                                    task.priority
                                                ] || {};

                                            return (
                                                <tr
                                                    key={
                                                        task.id
                                                    }
                                                    onClick={() =>
                                                        handleTaskClick(
                                                            task
                                                        )
                                                    }
                                                    className="border-t border-zinc-300 dark:border-zinc-800 group hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all cursor-pointer"
                                                >

                                                    {/* CHECKBOX */}

                                                    <td
                                                        onClick={(
                                                            e
                                                        ) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="pl-2 pr-1"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="size-3 accent-zinc-600 dark:accent-zinc-500"
                                                            onChange={() =>
                                                                handleTaskSelection(
                                                                    task.id
                                                                )
                                                            }
                                                            checked={selectedTasks.includes(
                                                                task.id
                                                            )}
                                                        />
                                                    </td>

                                                    {/* TITLE */}

                                                    <td className="px-4 pl-0 py-2">
                                                        {
                                                            task.title
                                                        }
                                                    </td>

                                                    {/* TYPE */}

                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2">
                                                            {Icon && (
                                                                <Icon
                                                                    className={`size-4 ${color}`}
                                                                />
                                                            )}

                                                            <span
                                                                className={`uppercase text-xs ${color}`}
                                                            >
                                                                {
                                                                    task.type
                                                                }
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* PRIORITY */}

                                                    <td className="px-4 py-2">
                                                        <span
                                                            className={`text-xs px-2 py-1 rounded ${
                                                                background ||
                                                                ""
                                                            } ${
                                                                prioritycolor ||
                                                                ""
                                                            }`}
                                                        >
                                                            {
                                                                task.priority
                                                            }
                                                        </span>
                                                    </td>

                                                    {/* STATUS */}

                                                    <td
                                                        onClick={(
                                                            e
                                                        ) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="px-4 py-2"
                                                    >
                                                        <select
                                                            name="status"
                                                            onChange={(
                                                                e
                                                            ) =>
                                                                handleStatusChange(
                                                                    task.id,
                                                                    e
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            value={
                                                                task.status
                                                            }
                                                            className="group-hover:ring ring-zinc-100 bg-white dark:bg-zinc-800 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer"
                                                        >
                                                            <option value="TODO">
                                                                To
                                                                Do
                                                            </option>

                                                            <option value="IN_PROGRESS">
                                                                In
                                                                Progress
                                                            </option>

                                                            <option value="DONE">
                                                                Done
                                                            </option>
                                                        </select>
                                                    </td>

                                                    {/* ASSIGNEE */}

                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-2">

                                                            {task.assignee?.image ? (
                                                                <img
                                                                    src={
                                                                        task
                                                                            .assignee
                                                                            .image
                                                                    }
                                                                    className="size-5 rounded-full"
                                                                    alt="avatar"
                                                                />
                                                            ) : null}

                                                            {task
                                                                .assignee
                                                                ?.name ||
                                                                "-"}
                                                        </div>
                                                    </td>

                                                    {/* DUE DATE */}

                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">

                                                            <CalendarIcon className="size-4" />

                                                            {task.due_date
                                                                ? format(
                                                                      new Date(
                                                                          task.due_date
                                                                      ),
                                                                      "dd MMMM"
                                                                  )
                                                                : "No due date"}
                                                        </div>
                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="text-center text-zinc-500 dark:text-zinc-400 py-6"
                                        >
                                            No tasks found
                                            for the
                                            selected
                                            filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>

                        </table>
                    </div>

                    {/* ==========================================
                        MOBILE VIEW
                    ========================================== */}

                    <div className="lg:hidden flex flex-col gap-4">

                        {filteredTasks.length >
                        0 ? (
                            filteredTasks.map(
                                (task) => {
                                    const {
                                        icon: Icon,
                                        color,
                                    } =
                                        typeIcons[
                                            task.type
                                        ] || {};

                                    const {
                                        background,
                                        prioritycolor,
                                    } =
                                        priorityTexts[
                                            task.priority
                                        ] || {};

                                    return (
                                        <div
                                            key={
                                                task.id
                                            }
                                            onClick={() =>
                                                handleTaskClick(
                                                    task
                                                )
                                            }
                                            className="dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2 cursor-pointer"
                                        >

                                            {/* TITLE + CHECKBOX */}

                                            <div className="flex items-center justify-between">

                                                <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">
                                                    {
                                                        task.title
                                                    }
                                                </h3>

                                                <input
                                                    type="checkbox"
                                                    className="size-4 accent-zinc-600 dark:accent-zinc-500"
                                                    onClick={(
                                                        e
                                                    ) =>
                                                        e.stopPropagation()
                                                    }
                                                    onChange={() =>
                                                        handleTaskSelection(
                                                            task.id
                                                        )
                                                    }
                                                    checked={selectedTasks.includes(
                                                        task.id
                                                    )}
                                                />

                                            </div>

                                            {/* TYPE */}

                                            <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">

                                                {Icon && (
                                                    <Icon
                                                        className={`size-4 ${color}`}
                                                    />
                                                )}

                                                <span
                                                    className={`${color} uppercase`}
                                                >
                                                    {
                                                        task.type
                                                    }
                                                </span>

                                            </div>

                                            {/* PRIORITY */}

                                            <div>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded ${
                                                        background ||
                                                        ""
                                                    } ${
                                                        prioritycolor ||
                                                        ""
                                                    }`}
                                                >
                                                    {
                                                        task.priority
                                                    }
                                                </span>
                                            </div>

                                            {/* STATUS */}

                                            <div
                                                onClick={(
                                                    e
                                                ) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <label className="text-zinc-600 dark:text-zinc-400 text-xs">
                                                    Status
                                                </label>

                                                <select
                                                    name="status"
                                                    onChange={(
                                                        e
                                                    ) =>
                                                        handleStatusChange(
                                                            task.id,
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    value={
                                                        task.status
                                                    }
                                                    className="w-full mt-1 bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200"
                                                >
                                                    <option value="TODO">
                                                        To Do
                                                    </option>

                                                    <option value="IN_PROGRESS">
                                                        In
                                                        Progress
                                                    </option>

                                                    <option value="DONE">
                                                        Done
                                                    </option>
                                                </select>
                                            </div>

                                            {/* ASSIGNEE */}

                                            <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">

                                                {task.assignee?.image ? (
                                                    <img
                                                        src={
                                                            task
                                                                .assignee
                                                                .image
                                                        }
                                                        className="size-5 rounded-full"
                                                        alt="avatar"
                                                    />
                                                ) : null}

                                                {task.assignee
                                                    ?.name ||
                                                    "-"}

                                            </div>

                                            {/* DUE DATE */}

                                            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">

                                                <CalendarIcon className="size-4" />

                                                {task.due_date
                                                    ? format(
                                                          new Date(
                                                              task.due_date
                                                          ),
                                                          "dd MMMM"
                                                      )
                                                    : "No due date"}

                                            </div>

                                        </div>
                                    );
                                }
                            )
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found
                                for the selected
                                filters.
                            </p>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;