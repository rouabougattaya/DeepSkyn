import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"
import { ChatWidget } from "./chat/ChatWidget"

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <div className="flex-1 min-h-[calc(100vh-64px)] lg:ml-64">
          <Outlet />
        </div>
      </div>
      <ChatWidget />
    </div>
  )
}
