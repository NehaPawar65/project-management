import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadTheme } from "../features/themeSlice";
import { fetchworkspaces } from "../features/workspaceSlice";
import { Loader2Icon } from "lucide-react";

import {
    useUser,
    useAuth,
    useOrganizationList,
    SignIn,
    CreateOrganization,
} from "@clerk/react";

const SYNC_POLL_INTERVAL_MS = 2000;
const SYNC_POLL_MAX_ATTEMPTS = 15;

// ============================================================
// AUTHENTICATED LAYOUT
// ============================================================

const AuthenticatedLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [syncFailed, setSyncFailed] = useState(false);

    const { loading, workspaces = [] } = useSelector(
        (state) => state.workspace
    );

    const dispatch = useDispatch();

    const { user } = useUser();
    const { getToken, orgId } = useAuth();

    const {
        isLoaded: isOrganizationsLoaded,
        userMemberships,
        setActive,
    } = useOrganizationList({
        userMemberships: true,
    });

    const pollRef = useRef(null);
    const attemptsRef = useRef(0);
    const activatingOrganizationRef = useRef(false);

    // ============================================================
    // LOAD THEME
    // ============================================================

    useEffect(() => {
        dispatch(loadTheme());
    }, [dispatch]);

    // ============================================================
    // ACTIVATE FIRST ORGANIZATION
    // ============================================================

    useEffect(() => {
        if (!isOrganizationsLoaded) {
            return;
        }

        if (!user) {
            return;
        }

        // Already active
        if (orgId) {
            return;
        }

        const memberships = userMemberships?.data || [];

        // User has no organizations
        if (memberships.length === 0) {
            return;
        }

        const firstMembership = memberships[0];

        const organizationId =
            firstMembership?.organization?.id;

        if (!organizationId) {
            return;
        }

        if (activatingOrganizationRef.current) {
            return;
        }

        activatingOrganizationRef.current = true;

        console.log(
            "Activating Clerk organization:",
            organizationId
        );

        setActive({
            organization: organizationId,
        })
            .then(() => {
                console.log(
                    "Clerk organization activated:",
                    organizationId
                );

                activatingOrganizationRef.current = false;
            })
            .catch((error) => {
                console.error(
                    "Failed to activate organization:",
                    error
                );

                activatingOrganizationRef.current = false;
            });
    }, [
        user,
        isOrganizationsLoaded,
        userMemberships,
        orgId,
        setActive,
    ]);

    // ============================================================
    // INITIAL WORKSPACE FETCH
    // ============================================================

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!isOrganizationsLoaded) {
            return;
        }

        if (workspaces.length > 0) {
            return;
        }

        console.log("Fetching workspaces...");

        dispatch(
            fetchworkspaces({
                getToken,
            })
        );
    }, [
        user,
        isOrganizationsLoaded,
        dispatch,
        getToken,
        workspaces.length,
    ]);

    // ============================================================
    // WORKSPACE SYNCHRONIZATION
    // ============================================================

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!isOrganizationsLoaded) {
            return;
        }

        // Already have workspace
        if (workspaces.length > 0) {
            setSyncFailed(false);
            attemptsRef.current = 0;

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            return;
        }

        // User has no Clerk organization
        const memberships = userMemberships?.data || [];

        if (memberships.length === 0) {
            setSyncFailed(true);
            return;
        }

        if (pollRef.current) {
            return;
        }

        attemptsRef.current = 0;
        setSyncFailed(false);

        const pollWorkspaces = async () => {
            attemptsRef.current += 1;

            console.log(
                `Workspace sync attempt ${attemptsRef.current}/${SYNC_POLL_MAX_ATTEMPTS}`
            );

            try {
                const result = await dispatch(
                    fetchworkspaces({
                        getToken,
                    })
                );

                const fetchedWorkspaces =
                    result.payload || [];

                console.log(
                    "Fetched workspaces:",
                    fetchedWorkspaces
                );

                if (fetchedWorkspaces.length > 0) {
                    setSyncFailed(false);

                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }

                    return;
                }

                if (
                    attemptsRef.current >=
                    SYNC_POLL_MAX_ATTEMPTS
                ) {
                    console.error(
                        "Workspace synchronization failed."
                    );

                    setSyncFailed(true);

                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            } catch (error) {
                console.error(
                    "Workspace synchronization error:",
                    error
                );

                if (
                    attemptsRef.current >=
                    SYNC_POLL_MAX_ATTEMPTS
                ) {
                    setSyncFailed(true);

                    if (pollRef.current) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                    }
                }
            }
        };

        pollWorkspaces();

        pollRef.current = setInterval(
            pollWorkspaces,
            SYNC_POLL_INTERVAL_MS
        );

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [
        user,
        isOrganizationsLoaded,
        userMemberships,
        dispatch,
        getToken,
        workspaces.length,
    ]);

    // ============================================================
    // CLEANUP
    // ============================================================

    useEffect(() => {
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    // ============================================================
    // CLERK ORGANIZATIONS LOADING
    // ============================================================

    if (!isOrganizationsLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        );
    }

    // ============================================================
    // NO ORGANIZATION
    // ============================================================

    if (!orgId) {
        const memberships = userMemberships?.data || [];

        if (memberships.length === 0) {
            return (
                <div className="min-h-screen flex flex-col gap-4 justify-center items-center bg-white dark:bg-zinc-950 px-6">
                    <p className="text-sm text-gray-700 dark:text-slate-300">
                        You don't have a workspace yet.
                    </p>

                    <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md text-center">
                        Create a workspace to continue.
                    </p>

                    <CreateOrganization />
                </div>
            );
        }

        return (
            <div className="min-h-screen flex flex-col gap-3 justify-center items-center bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />

                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Activating your organization…
                </p>
            </div>
        );
    }

    // ============================================================
    // WORKSPACE LOADING
    // ============================================================

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        );
    }

    // ============================================================
    // WORKSPACE SYNC FAILED
    // ============================================================

    if (workspaces.length === 0 && syncFailed) {
        return (
            <div className="min-h-screen flex flex-col gap-4 justify-center items-center bg-white dark:bg-zinc-950 px-6">
                <p className="text-sm text-red-500 max-w-md text-center">
                    We couldn't find your workspace after
                    synchronization.
                </p>

                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md text-center">
                    Please refresh the page and try again.
                </p>

                <CreateOrganization />
            </div>
        );
    }

    // ============================================================
    // WAITING FOR WORKSPACE
    // ============================================================

    if (workspaces.length === 0) {
        return (
            <div className="min-h-screen flex flex-col gap-3 justify-center items-center bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />

                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Setting up your workspace…
                </p>
            </div>
        );
    }

    // ============================================================
    // NORMAL APPLICATION
    // ============================================================

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <div className="flex-1 flex flex-col h-screen">
                <Navbar
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                />

                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

// ============================================================
// ROOT LAYOUT
// ============================================================

const Layout = () => {
    const { user, isLoaded } = useUser();

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Not signed in
    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen bg-white dark:bg-zinc-950">
                <SignIn />
            </div>
        );
    }

    // IMPORTANT:
    // useOrganizationList() is only mounted AFTER
    // Clerk confirms that the user is signed in.
    return <AuthenticatedLayout />;
};

export default Layout;