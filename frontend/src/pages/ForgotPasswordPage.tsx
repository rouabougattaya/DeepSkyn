"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, ArrowLeft, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError("")

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || "Something went wrong")
            }

            setIsSent(true)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (isSent) {
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

                <div className="w-full max-w-[440px] mt-20 text-center">
                    <div className="w-16 h-16 bg-[#ccfbf1] text-[#0d9488] rounded-full flex items-center justify-center mx-auto mb-6">
                        <MailCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-[32px] font-bold text-slate-900 mb-2">Check your email</h1>
                    <p className="text-slate-500 mb-8">
                        We've sent a password reset link to <span className="font-medium text-slate-900">{email}</span>.
                    </p>
                    <Link to="/auth/login">
                        <Button className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white">
                            Back to Sign In
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

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
                <Link
                    to="/auth/login"
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-[32px] font-bold text-slate-900 mb-2">
                        Forgot Password?
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-900">
                            Email Address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 bg-white border-slate-200 focus:ring-[#0d9488]"
                            required
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <Button
                        type="submit"
                        className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? "Sending link..." : "Send Reset Link"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
