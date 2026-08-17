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

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [syncFailed, setSyncFailed] = useState(false);

    const { loading, workspaces } = useSelector(
        (state) => state.workspace
    );

    const dispatch = useDispatch();

    const { user, isLoaded: isUserLoaded } = useUser();

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

    // Load theme
    useEffect(() => {
        dispatch(loadTheme());
    }, [dispatch]);

    // Automatically activate user's organization
    useEffect(() => {
        if (!isUserLoaded || !user) {
            return;
        }

        if (!isOrganizationsLoaded) {
            return;
        }

        if (orgId) {
            return;
        }

        const memberships =
            userMemberships?.data || [];

        if (memberships.length === 0) {
            return;
        }

        const membership = memberships[0];

        const organizationId =
            membership?.organization?.id;

        if (!organizationId) {
            return;
        }

        if (activatingOrganizationRef.current) {
            return;
        }

        activatingOrganizationRef.current = true;

        setActive({
            organization: organizationId,
        }).catch((error) => {
            console.error(
                "Failed to activate organization:",
                error
            );

            activatingOrganizationRef.current = false;
        });
    }, [
        isUserLoaded,
        user,
        isOrganizationsLoaded,
        userMemberships,
        orgId,
        setActive,
    ]);

    // Initial workspace fetch
    useEffect(() => {
        if (!isUserLoaded || !user) {
            return;
        }

        if (workspaces.length === 0) {
            dispatch(
                fetchworkspaces({
                    getToken,
                })
            );
        }
    }, [
        isUserLoaded,
        user,
        dispatch,
        getToken,
        workspaces.length,
    ]);

    // Workspace synchronization polling
    useEffect(() => {
        if (!isUserLoaded || !user) {
            return;
        }

        if (workspaces.length > 0) {
            setSyncFailed(false);
            attemptsRef.current = 0;

            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }

            return;
        }

        if (pollRef.current) {
            return;
        }

        attemptsRef.current = 0;
        setSyncFailed(false);

        const pollWorkspaces = async () => {
            attemptsRef.current += 1;

            try {
                const result = await dispatch(
                    fetchworkspaces({
                        getToken,
                    })
                );

                const fetchedWorkspaces =
                    result.payload || [];

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

        // Run immediately
        pollWorkspaces();

        // Continue polling
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
        isUserLoaded,
        user,
        dispatch,
        getToken,
        workspaces.length,
    ]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, []);

    // Clerk loading
    if (!isUserLoaded || !isOrganizationsLoaded) {
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

    // Workspace loading
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        );
    }

    // No active organization yet
    if (!orgId && !syncFailed) {
        return (
            <div className="min-h-screen flex flex-col gap-3 justify-center items-center bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />

                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Setting up your organization…
                </p>
            </div>
        );
    }

    // Waiting for workspace synchronization
    if (workspaces.length === 0 && !syncFailed) {
        return (
            <div className="min-h-screen flex flex-col gap-3 justify-center items-center bg-white dark:bg-zinc-950">
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />

                <p className="text-sm text-gray-500 dark:text-slate-400">
                    Setting up your workspace…
                </p>
            </div>
        );
    }

    // Synchronization failed
    if (workspaces.length === 0 && syncFailed) {
        return (
            <div className="min-h-screen flex flex-col gap-4 justify-center items-center bg-white dark:bg-zinc-950 px-6">
                <p className="text-sm text-red-500 max-w-md text-center">
                    We couldn't find your workspace after
                    synchronization.
                </p>

                <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md text-center">
                    If you accepted an invitation, please wait a
                    moment and refresh the page. If this is a new
                    account, you can create an organization.
                </p>

                <CreateOrganization />
            </div>
        );
    }

    // Normal application
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

export default Layout;