"use client"

import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [strength, setStrength] = useState(0)

    useEffect(() => {
        // Basic password strength logic
        let s = 0
        if (password.length >= 8) s++
        if (/[A-Z]/.test(password)) s++
        if (/[0-9]/.test(password)) s++
        if (/[^A-Za-z0-9]/.test(password)) s++
        setStrength(s)
    }, [password])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        if (strength < 2) {
            setError("Please use a stronger password")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password")
            }

            // Success - redirect to login
            navigate('/auth/login', { state: { message: "Password reset successful! Please sign in with your new password." } })
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const strengthColors = ["bg-slate-200", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"]
    const strengthLabels = ["Empty", "Weak", "Fair", "Good", "Strong"]

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4">
            {/* Top Left Logo */}
            <div className="w-full max-w-7xl flex justify-start p-4">
                <Link to="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0d9488] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900">DeepSkyn</span>
                </Link>
            </div>

            <div className="w-full max-w-[440px] mt-20">
                <div className="mb-10">
                    <h1 className="text-[32px] font-bold text-slate-900 mb-2">Create New Password</h1>
                    <p className="text-slate-500 text-sm">Your new password must be different from previous ones.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">New Password</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 bg-white border-slate-200 pr-10"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Strength indicator */}
                        <div className="space-y-1">
                            <div className="flex gap-1 h-1 mt-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className={`flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : "bg-slate-200"}`}
                                    />
                                ))}
                            </div>
                            <p className={`text-[11px] font-medium flex items-center gap-1 ${strength >= 3 ? "text-green-600" : "text-slate-400"}`}>
                                {strength >= 3 ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                                Security: {strengthLabels[strength]}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Confirm Password</label>
                        <Input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 bg-white border-slate-200"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
