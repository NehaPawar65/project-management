import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../configs/api";

export const fetchworkspaces = createAsyncThunk(
    "workspace/fetchworkspaces",
    async ({ getToken }, { rejectWithValue }) => {
        try {
            const token = await getToken();

            const response = await api.get("/api/workspaces", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            return response.data?.workspaces || [];
        } catch (error) {
            console.error(
                "Failed to fetch workspaces:",
                error?.response?.data || error.message
            );

            return rejectWithValue(
                error?.response?.data?.message ||
                    error?.response?.data?.error ||
                    error.message ||
                    "Failed to fetch workspaces"
            );
        }
    }
);

const initialState = {
    workspaces: [],
    currentWorkspace: null,
    loading: false,
};

const workspaceSlice = createSlice({
    name: "workspace",

    initialState,

    reducers: {
        setWorkspaces: (state, action) => {
            state.workspaces = action.payload;

            // Keep current workspace in sync
            if (state.currentWorkspace) {
                const updatedWorkspace = action.payload.find(
                    (workspace) =>
                        workspace.id === state.currentWorkspace.id
                );

                if (updatedWorkspace) {
                    state.currentWorkspace = updatedWorkspace;
                }
            }
        },

        setCurrentWorkspace: (state, action) => {
            localStorage.setItem(
                "currentWorkspaceId",
                action.payload
            );

            state.currentWorkspace =
                state.workspaces.find(
                    (workspace) =>
                        workspace.id === action.payload
                ) || null;
        },

        addWorkspace: (state, action) => {
            state.workspaces.push(action.payload);

            if (
                !state.currentWorkspace ||
                state.currentWorkspace.id !== action.payload.id
            ) {
                state.currentWorkspace = action.payload;
            }
        },

        updateWorkspace: (state, action) => {
            state.workspaces = state.workspaces.map(
                (workspace) =>
                    workspace.id === action.payload.id
                        ? action.payload
                        : workspace
            );

            if (
                state.currentWorkspace?.id ===
                action.payload.id
            ) {
                state.currentWorkspace = action.payload;
            }
        },

        deleteWorkspace: (state, action) => {
            state.workspaces = state.workspaces.filter(
                (workspace) =>
                    workspace.id !== action.payload
            );

            if (
                state.currentWorkspace?.id ===
                action.payload
            ) {
                state.currentWorkspace = null;
            }
        },

        addProject: (state, action) => {
            if (!state.currentWorkspace) {
                return;
            }

            if (!state.currentWorkspace.projects) {
                state.currentWorkspace.projects = [];
            }

            state.currentWorkspace.projects.push(
                action.payload
            );

            state.workspaces = state.workspaces.map(
                (workspace) =>
                    workspace.id ===
                    state.currentWorkspace.id
                        ? {
                              ...workspace,
                              projects: [
                                  ...(workspace.projects || []),
                                  action.payload,
                              ],
                          }
                        : workspace
            );
        },

        addTask: (state, action) => {
            if (!state.currentWorkspace) {
                return;
            }

            if (!state.currentWorkspace.projects) {
                return;
            }

            state.currentWorkspace.projects =
                state.currentWorkspace.projects.map(
                    (project) => {
                        if (
                            project.id ===
                            action.payload.projectId
                        ) {
                            if (!project.tasks) {
                                project.tasks = [];
                            }

                            project.tasks.push(
                                action.payload
                            );
                        }

                        return project;
                    }
                );

            state.workspaces = state.workspaces.map(
                (workspace) =>
                    workspace.id ===
                    state.currentWorkspace.id
                        ? {
                              ...workspace,
                              projects: (
                                  workspace.projects || []
                              ).map((project) =>
                                  project.id ===
                                  action.payload.projectId
                                      ? {
                                            ...project,
                                            tasks: [
                                                ...(project.tasks ||
                                                    []),
                                                action.payload,
                                            ],
                                        }
                                      : project
                              ),
                          }
                        : workspace
            );
        },

        updateTask: (state, action) => {
            if (!state.currentWorkspace) {
                return;
            }

            state.currentWorkspace.projects =
                state.currentWorkspace.projects?.map(
                    (project) => {
                        if (
                            project.id ===
                            action.payload.projectId
                        ) {
                            project.tasks =
                                project.tasks?.map((task) =>
                                    task.id ===
                                    action.payload.id
                                        ? action.payload
                                        : task
                                ) || [];
                        }

                        return project;
                    }
                ) || [];

            state.workspaces = state.workspaces.map(
                (workspace) =>
                    workspace.id ===
                    state.currentWorkspace.id
                        ? {
                              ...workspace,
                              projects: (
                                  workspace.projects || []
                              ).map((project) =>
                                  project.id ===
                                  action.payload.projectId
                                      ? {
                                            ...project,
                                            tasks: (
                                                project.tasks ||
                                                []
                                            ).map((task) =>
                                                task.id ===
                                                action.payload.id
                                                    ? action.payload
                                                    : task
                                            ),
                                        }
                                      : project
                              ),
                          }
                        : workspace
            );
        },

        deleteTask: (state, action) => {
            if (!state.currentWorkspace) {
                return;
            }

            const taskIds = Array.isArray(action.payload)
                ? action.payload
                : [];

            state.currentWorkspace.projects =
                state.currentWorkspace.projects?.map(
                    (project) => ({
                        ...project,
                        tasks: (
                            project.tasks || []
                        ).filter(
                            (task) =>
                                !taskIds.includes(task.id)
                        ),
                    })
                ) || [];

            state.workspaces = state.workspaces.map(
                (workspace) =>
                    workspace.id ===
                    state.currentWorkspace.id
                        ? {
                              ...workspace,
                              projects: (
                                  workspace.projects || []
                              ).map((project) => ({
                                  ...project,
                                  tasks: (
                                      project.tasks || []
                                  ).filter(
                                      (task) =>
                                          !taskIds.includes(
                                              task.id
                                          )
                                  ),
                              })),
                          }
                        : workspace
            );
        },
    },

    extraReducers: (builder) => {
        builder.addCase(
            fetchworkspaces.pending,
            (state) => {
                state.loading = true;
            }
        );

        builder.addCase(
            fetchworkspaces.fulfilled,
            (state, action) => {
                state.loading = false;

                const workspaces = action.payload || [];

                state.workspaces = workspaces;

                if (workspaces.length === 0) {
                    state.currentWorkspace = null;
                    return;
                }

                const currentWorkspaceId =
                    localStorage.getItem(
                        "currentWorkspaceId"
                    );

                if (currentWorkspaceId) {
                    const findWorkspace =
                        workspaces.find(
                            (workspace) =>
                                workspace.id ===
                                currentWorkspaceId
                        );

                    if (findWorkspace) {
                        state.currentWorkspace =
                            findWorkspace;
                    } else {
                        state.currentWorkspace =
                            workspaces[0];
                    }
                } else {
                    state.currentWorkspace =
                        workspaces[0];
                }
            }
        );

        builder.addCase(
            fetchworkspaces.rejected,
            (state, action) => {
                state.loading = false;

                console.error(
                    "fetchworkspaces rejected:",
                    action.payload
                );
            }
        );
    },
});

export const {
    setWorkspaces,
    setCurrentWorkspace,
    addWorkspace,
    updateWorkspace,
    deleteWorkspace,
    addProject,
    addTask,
    updateTask,
    deleteTask,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;