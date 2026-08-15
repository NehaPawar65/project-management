import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import {
    useClerk,
    useOrganizationList,
    useAuth,
} from "@clerk/react";

function WorkspaceDropdown() {
    const {
        setActive,
        userMemberships,
        isLoaded,
    } = useOrganizationList({
        userMemberships: true,
    });

    const { orgId } = useAuth();

    const { openCreateOrganization } = useClerk();

    const {
        workspaces = [],
        currentWorkspace = null,
    } = useSelector((state) => state.workspace);

    const [isOpen, setIsOpen] = useState(false);

    // Local selected organization.
    // This makes the check mark update immediately when clicked.
    const [selectedOrganizationId, setSelectedOrganizationId] = useState(
        currentWorkspace?.id || orgId || null
    );

    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    // =========================================================
    // Keep selected workspace synchronized with Clerk
    // =========================================================
    useEffect(() => {
        if (orgId) {
            setSelectedOrganizationId(orgId);
        }
    }, [orgId]);

    // =========================================================
    // Keep local selected workspace synchronized with Redux
    // when there is no active Clerk organization yet
    // =========================================================
    useEffect(() => {
        if (!orgId && currentWorkspace?.id) {
            setSelectedOrganizationId(currentWorkspace.id);
        }
    }, [orgId, currentWorkspace?.id]);

    // =========================================================
    // Select Workspace
    // =========================================================
    const onSelectWorkspace = async (organization) => {
        if (!organization?.id) return;

        const organizationId = organization.id;

        // -----------------------------------------------------
        // Update selected state immediately.
        // This makes the check mark move instantly.
        // -----------------------------------------------------
        setSelectedOrganizationId(organizationId);

        // -----------------------------------------------------
        // Find matching workspace from backend/Redux
        // -----------------------------------------------------
        const workspace = workspaces.find(
            (workspace) => workspace.id === organizationId
        );

        // -----------------------------------------------------
        // Update Redux current workspace
        // -----------------------------------------------------
        if (workspace) {
            dispatch(
                setCurrentWorkspace({
                    ...workspace,

                    // Always use the selected Clerk organization's
                    // image.
                    image_url:
                        organization.imageUrl ||
                        workspace.image_url ||
                        workspace.imageUrl ||
                        "",
                })
            );
        } else {
            // Fallback if backend workspace isn't found
            dispatch(
                setCurrentWorkspace({
                    id: organization.id,
                    name: organization.name,
                    image_url: organization.imageUrl || "",
                })
            );
        }

        // -----------------------------------------------------
        // Change active Clerk organization
        // -----------------------------------------------------
        try {
            await setActive({
                organization: organizationId,
            });
        } catch (error) {
            console.error(
                "Failed to change active Clerk organization:",
                error
            );
        }

        // -----------------------------------------------------
        // Close dropdown
        // -----------------------------------------------------
        setIsOpen(false);

        // -----------------------------------------------------
        // Navigate back to dashboard
        // -----------------------------------------------------
        navigate("/");
    };

    // =========================================================
    // Close dropdown when clicking outside
    // =========================================================
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // =========================================================
    // Loading State
    // =========================================================
    if (!isLoaded) {
        return (
            <div className="relative m-4">
                <div className="w-full flex items-center gap-3 p-3 rounded">
                    <div className="w-8 h-8 rounded bg-gray-200 dark:bg-zinc-800 animate-pulse" />

                    <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />

                        <div className="h-3 w-16 mt-1 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // Determine currently selected organization
    // =========================================================
    const activeOrganization =
        userMemberships?.data?.find(
            (membership) =>
                membership.organization?.id === selectedOrganizationId
        )?.organization || null;

    // Prefer Clerk organization data for the currently selected
    // workspace because it is the source of truth for active org.
    const displayWorkspace =
        activeOrganization ||
        currentWorkspace ||
        null;

    return (
        <div
            className="relative m-4"
            ref={dropdownRef}
        >
            {/* =================================================
                Current Workspace
            ================================================= */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src={
                            displayWorkspace?.imageUrl ||
                            displayWorkspace?.image_url ||
                            ""
                        }
                        alt={
                            displayWorkspace?.name ||
                            "Workspace"
                        }
                        className="w-8 h-8 rounded shadow object-cover"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {displayWorkspace?.name ||
                                "Select Workspace"}
                        </p>

                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length ||
                                userMemberships?.data?.length ||
                                0}{" "}
                            {(workspaces.length ||
                                userMemberships?.data?.length ||
                                0) === 1
                                ? "workspace"
                                : "workspaces"}
                        </p>
                    </div>
                </div>

                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {/* =================================================
                Workspace Dropdown
            ================================================= */}
            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>

                        {userMemberships?.data?.length > 0 ? (
                            userMemberships.data.map((membership) => {
                                const organization =
                                    membership.organization;

                                if (!organization) {
                                    return null;
                                }

                                const isSelected =
                                    selectedOrganizationId ===
                                    organization.id;

                                return (
                                    <div
                                        key={organization.id}
                                        onClick={() =>
                                            onSelectWorkspace(
                                                organization
                                            )
                                        }
                                        className={`flex items-center gap-3 p-2 cursor-pointer rounded ${
                                            isSelected
                                                ? "bg-gray-100 dark:bg-zinc-800"
                                                : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                                        }`}
                                    >
                                        {/* =================================================
                                            THIS ORGANIZATION'S OWN IMAGE
                                        ================================================= */}
                                        <img
                                            src={
                                                organization.imageUrl ||
                                                ""
                                            }
                                            alt={organization.name}
                                            className="w-8 h-8 rounded shadow object-cover"
                                        />

                                        {/* Organization Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                {
                                                    organization.name
                                                }
                                            </p>

                                            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                                {
                                                    organization.membersCount ||
                                                    0
                                                }{" "}
                                                members
                                            </p>
                                        </div>

                                        {/* =================================================
                                            SELECTED WORKSPACE CHECK MARK
                                        ================================================= */}
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-zinc-400 px-2 py-3">
                                No workspaces found
                            </p>
                        )}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    {/* =================================================
                        Create Workspace
                    ================================================= */}
                    <div
                        onClick={() => {
                            openCreateOrganization();
                            setIsOpen(false);
                        }}
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800"
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" />
                            Create Workspace
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default WorkspaceDropdown;