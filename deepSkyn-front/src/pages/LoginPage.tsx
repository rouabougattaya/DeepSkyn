// frontend/src/pages/LoginPage.tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Eye, EyeOff, Shield } from "lucide-react"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { simpleAuthService } from '@/services/authService-simple';
import ReCAPTCHA from "react-google-recaptcha";

type AuthResponse = any;

// Clé reCAPTCHA (utilise la clé de test si pas de variable d'environnement)
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const navigate = useNavigate()
  
  const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth()

  // Vérifier si déjà connecté
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('✅ Déjà connecté, redirection vers home');
      navigate('/')
    }
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier que le captcha est validé
    if (!captchaToken) {
      setErrorMessage("Veuillez valider le captcha");
      return;
    }
    
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      console.log('📤 Tentative login avec captcha:', captchaToken.substring(0, 10) + '...');
      
      const authData: AuthResponse = await simpleAuthService.loginWithEmail(
        email, 
        password,
        captchaToken
      )
      
      console.log('📦 Réponse brute:', authData)
      
      // Récupération du token
      let token = null;
      if (authData?.token) {
        token = authData.token;
        console.log('🔑 Token trouvé dans authData.token');
      } else if (authData?.accessToken) {
        token = authData.accessToken;
        console.log('🔑 Token trouvé dans authData.accessToken');
      } else if (authData?.jwt) {
        token = authData.jwt;
        console.log('🔑 Token trouvé dans authData.jwt');
      } else if (authData?.data?.token) {
        token = authData.data.token;
        console.log('🔑 Token trouvé dans authData.data.token');
      }
      
      if (token) {
        // Sauvegarde le token
        localStorage.setItem('token', token);
        console.log('✅ Token sauvegardé dans localStorage');
        
        // Sauvegarde aussi les infos user si disponibles
        if (authData.user) {
          localStorage.setItem('auth_user', JSON.stringify(authData.user));
        }
        
        // Réinitialise le captcha
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setCaptchaToken(null);
        
        // Redirection vers la page d'accueil
        console.log('🔄 Redirection vers /');
        window.location.href = '/';
        
      } else {
        console.error('❌ Aucun token trouvé dans:', authData);
        setErrorMessage('Erreur: Token non reçu');
      }
      
    } catch (error: any) {
      console.error('❌ Login failed:', error)
      
      // Message d'erreur plus détaillé
      if (error.response?.status === 401) {
        setErrorMessage('Email ou mot de passe incorrect');
      } else if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Erreur de connexion au serveur');
      }
      
      // Réinitialise le captcha en cas d'erreur
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { signInWithGoogleRedirect } = await import('@/hooks/useGoogleAuth');
      signInWithGoogleRedirect();
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setErrorMessage('Erreur lors de la connexion Google');
    }
  };

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    console.log('🔐 Captcha validé:', token ? 'Oui' : 'Non');
  };

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
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-[32px] font-bold text-slate-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-500 text-sm">
            Sign in to your DeepSkyn account to continue
          </p>
        </div>

        {/* Message d'erreur */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {/* Formulaire de connexion */}
        <form onSubmit={handleEmailLogin} className="space-y-6">
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-900">
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white border-slate-200 pr-10 focus:ring-[#0d9488]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* reCAPTCHA */}
          <div className="flex justify-center my-4">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              theme="light"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="rounded border-slate-300 text-[#0d9488] focus:ring-[#0d9488]"
              />
              <label htmlFor="remember" className="text-sm text-slate-500">
                Remember me
              </label>
            </div>
            <Link 
              to="/auth/forgot-password" 
              className="text-sm font-medium text-[#0d9488] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-[#0d9488] hover:bg-[#0a7a70] text-white font-semibold rounded-lg transition-colors"
            disabled={isLoading || !captchaToken}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#f8fafc] px-3 text-slate-400 font-medium">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Logins */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-12 border-slate-200 font-medium bg-white hover:bg-slate-50" 
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? 'Connecting...' : 'Google'}
          </Button>
          
          <Button 
            variant="outline" 
            className="h-12 border-slate-200 font-medium bg-white hover:bg-slate-50"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.073 21.376c-1.447 0-2.626-1.18-2.626-2.626s1.18-2.627 2.626-2.627c1.448 0 2.627 1.181 2.627 2.627s-1.18 2.626-2.627 2.626zm-10.146 0c-1.448 0-2.627-1.18-2.627-2.626s1.18-2.627 2.627-2.627c1.447 0 2.626 1.181 2.626 2.627s-1.18 2.626-2.626 2.626zm1.586-15.402c2.31 0 4.182 1.873 4.182 4.182 0 2.31-1.873 4.182-4.182 4.182-2.31 0-4.182-1.872-4.182-4.182 0-2.309 1.872-4.182 4.182-4.182zm0-1.974c-3.4 0-6.156 2.756-6.156 6.156s2.756 6.156 6.156 6.156 6.156-2.756 6.156-6.156-2.756-6.156-6.156-6.156z" />
            </svg>
            Apple
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-slate-500 text-sm">
            Don't have an account?{" "}
            <Link 
              to="/auth/register" 
              className="text-[#0d9488] hover:underline font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}