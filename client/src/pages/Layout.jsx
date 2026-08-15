import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchworkspaces } from '../features/workspaceSlice'
import { Loader2Icon } from 'lucide-react'
import { useUser, useAuth, SignIn, CreateOrganization } from '@clerk/react'

const SYNC_POLL_INTERVAL_MS = 2000
const SYNC_POLL_MAX_ATTEMPTS = 15 // ~30s total

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [syncFailed, setSyncFailed] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const dispatch = useDispatch()
    const { user, isLoaded } = useUser()
    const { getToken, orgId } = useAuth()
    const pollRef = useRef(null)

    useEffect(() => { dispatch(loadTheme()) }, [])

    useEffect(() => {
        if (isLoaded && user && workspaces.length === 0) {
            dispatch(fetchworkspaces({ getToken }))
        }
    }, [isLoaded, user])

    // Deliberately does NOT depend on `workspaces` - see note above.
    useEffect(() => {
        if (!isLoaded || !orgId) return
        if (workspaces.some((w) => w.id === orgId)) { setSyncFailed(false); return }
        if (pollRef.current) return

        let attempts = 0
        setSyncFailed(false)

        pollRef.current = setInterval(async () => {
            attempts += 1
            const result = await dispatch(fetchworkspaces({ getToken }))
            const fetched = result.payload || []
            const found = fetched.some((w) => w.id === orgId)

            if (found || attempts >= SYNC_POLL_MAX_ATTEMPTS) {
                clearInterval(pollRef.current)
                pollRef.current = null
                if (!found) setSyncFailed(true)
            }
        }, SYNC_POLL_INTERVAL_MS)

        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, isLoaded])

    if (!user) return <div className='flex justify-center items-center h-screen bg-white dark:bg-zinc-950'><SignIn /></div>
    if (loading) return <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'><Loader2Icon className="size-7 text-blue-500 animate-spin" /></div>

    if (user && orgId && workspaces.length === 0 && !syncFailed) {
        return (
            <div className='min-h-screen flex flex-col gap-3 justify-center items-center bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                <p className='text-sm text-gray-500 dark:text-slate-400'>Setting up your workspace…</p>
            </div>
        )
    }

    if (user && workspaces.length === 0 && (!orgId || syncFailed)) {
        return (
            <div className='min-h-screen flex flex-col gap-4 justify-center items-center bg-white dark:bg-zinc-950'>
                {syncFailed && <p className='text-sm text-red-500 max-w-sm text-center'>This is taking longer than expected. Check the Inngest dashboard for a failed run, or try creating the organization again.</p>}
                <CreateOrganization />
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll"><Outlet /></div>
            </div>
        </div>
    )
}

export default Layout