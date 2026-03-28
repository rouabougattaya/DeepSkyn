import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { Sidebar } from "./Sidebar"
import { AIChatOverlay } from "./AIChatOverlay"
import { useSharedChat } from "../hooks/useSharedChat"

export function AppLayout() {
  const [isCoachOpen, setIsCoachOpen] = useState(false)
  const sharedChat = useSharedChat()

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar isCoachOpen={isCoachOpen} onOpenCoach={() => setIsCoachOpen(true)} />
        <div className="flex-1 min-h-[calc(100vh-64px)] lg:ml-64">
          <Outlet />
        </div>
      </div>
      <AIChatOverlay isOpen={isCoachOpen} onClose={() => setIsCoachOpen(false)} chat={sharedChat} />
    </div>
  )
}
