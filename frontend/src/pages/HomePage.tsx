import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import {
  Sparkles,
  Camera,
  MessageCircle,
  Sun,
  Moon,
  Shield,
  Zap,
  ArrowRight,
  Star,
  CheckCircle,
  CreditCard,
  Brain
} from "lucide-react"

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* --- NAVIGATION --- */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-[#0d9488] rounded-full text-sm font-semibold mb-8 border border-teal-100 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Dermatology Assistant</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-[1.1]">
            Discover Your Skin's <br />
            <span className="text-[#0d9488]">True Potential</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Get personalized AI-powered skin analysis and routines tailored just for you.
            Science-backed results in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button
              onClick={() => navigate('/analysis')}
              className="group inline-flex items-center px-8 py-4 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-bold rounded-2xl transition-all shadow-xl shadow-teal-500/20 hover:scale-[1.02]"
            >
              <Camera className="w-5 h-5 mr-2" />
              Start Free Analysis
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-2xl border border-slate-200 transition-all shadow-sm hover:shadow-md"
            >
              View Plans
            </button>
          </div>

          {/* Quick Features Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0d9488]">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-700">Free to Start</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0d9488]">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-700">No Credit Card</span>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#0d9488]">
                <Brain className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-700">AI-Powered</span>
            </div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 bg-white border-y border-slate-100 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">How DeepSkyn Works</h2>
            <p className="text-slate-500">Transform your skincare journey in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Step number="01" title="Upload Photos" description="Take clear photos of your face for our AI to process." />
            <Step number="02" title="AI Analysis" description="Advanced algorithms analyze texture, pores, and tone." />
            <Step number="03" title="Custom Routine" description="Receive a personalized AM/PM routine and product tips." />
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard to="/analysis" icon={<Camera />} title="Skin Analysis" description="Fitzpatrick scale and deep tissue assessment." />
            <FeatureCard to="/routines" icon={<Sun />} title="AM Routine" description="Protection and hydration for your busy day." />
            <FeatureCard to="/routines" icon={<Moon />} title="PM Routine" description="Repair and rejuvenation while you sleep." />
            <FeatureCard to="/ai-demo" icon={<MessageCircle />} title="AI Coach" description="Chat anytime for expert skincare advice." />
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-16">Trusted by Skincare Lovers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Testimonial quote="The accuracy of the AI analysis is mind-blowing. My acne has significantly reduced." author="Sarah L." />
            <Testimonial quote="Finally, a routine that actually makes sense for my specific skin type." author="James K." />
            <Testimonial quote="I love the AI Coach feature. It's like having a dermatologist in my pocket." author="Elena R." />
          </div>
        </div>
      </section>

      {/* --- TRUST FOOTER --- */}
      <footer className="py-12 bg-slate-900 text-white px-4 text-center">
        <div className="flex flex-wrap justify-center gap-8 mb-8 opacity-60">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> <span>GDPR Compliant</span></div>
          <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> <span>Secure & Private</span></div>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> <span>24/7 Support</span></div>
        </div>
        <p className="text-slate-400 text-sm">© 2024 DeepSkyn AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

// --- LIBRLESS COMPONENTS ---

function FeatureCard({ icon, title, description, to }: { icon: React.ReactNode, title: string, description: string, to?: string }) {
  const content = (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 hover:border-[#0d9488]/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all group cursor-pointer h-full">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-[#0d9488] mb-6 group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" } as any)}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
  )

  return to ? (
    <Link to={to} className="block h-full">
      {content}
    </Link>
  ) : content
}

function Step({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="relative group text-center md:text-left">
      <div className="text-6xl font-black text-slate-100 absolute -top-8 left-0 md:-left-4 z-0 transition-colors group-hover:text-teal-50">
        {number}
      </div>
      <div className="relative z-10">
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function Testimonial({ quote, author }: { quote: string, author: string }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-left">
      <div className="flex text-yellow-400 mb-4">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
      </div>
      <p className="text-slate-700 italic mb-6">"{quote}"</p>
      <p className="font-bold text-slate-900">— {author}</p>
    </div>
  )
}