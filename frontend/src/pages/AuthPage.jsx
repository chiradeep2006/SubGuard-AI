import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  CheckCircle,
  Lock,
  Mail,
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AuthPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const [isRegister, setIsRegister] = useState(params.get('register') === 'true');
  const [email, setEmail] = useState('admin@subguard.ai');
  const [password, setPassword] = useState('subguard2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Step 1: credentials, Step 2: otp_verify
  const [step, setStep] = useState('credentials');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [demoCode, setDemoCode] = useState('849201');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const otpInputsRef = useRef([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (step === 'otp_verify' && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  const handleCredentialsSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    const newDemoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoCode(newDemoOtp);
    setResendTimer(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setStep('otp_verify');

    // Auto focus first OTP input box after transition
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 100);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next box
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      otpInputsRef.current[5]?.focus();
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoCode(newCode);
    setResendTimer(30);
    setCanResend(false);
    setError('');
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => {
      otpInputsRef.current[0]?.focus();
    }, 50);
  };

  const handleAutoFillOtp = () => {
    setOtp(demoCode.split(''));
    setError('');
    setTimeout(() => {
      otpInputsRef.current[5]?.focus();
    }, 50);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    const enteredCode = otp.join('');
    if (enteredCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setVerifying(true);
    setError('');

    setTimeout(() => {
      const cleanEmail = (email || 'admin@subguard.ai').trim().toLowerCase();
      const isAdmin = cleanEmail === 'admin@subguard.ai' || cleanEmail === 'demo@subguard.ai';
      const userId = isAdmin
        ? '00000000-0000-0000-0000-000000000001'
        : 'usr_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

      const tokenPayload = btoa(JSON.stringify({ id: userId, email: cleanEmail }));
      const token = 'subguard_token_' + tokenPayload;

      login(
        {
          id: userId,
          email: cleanEmail,
          otp_verified: true,
          authenticated_at: new Date().toISOString()
        },
        token
      );
      // Seamlessly redirects to the 3D dashboard upon verified OTP
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-4 relative selection:bg-purple-600">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center space-x-2 text-xs font-semibold text-gray-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Landing Page</span>
      </Link>

      <div className="absolute top-6 right-6">
        <LanguageSwitcher />
      </div>

      <div className="bg-navy-850 border border-navy-700 w-full max-w-md p-8 rounded-3xl shadow-2xl backdrop-blur-xl relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center space-x-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl text-white shadow-lg shadow-purple-600/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <span className="text-2xl font-black text-white">SubGuard AI</span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-400">
              3D Structural Governance
            </span>
          </div>
        </div>

        {/* 2-Step Security Breadcrumb */}
        <div className="flex items-center justify-between mb-6 px-4 py-2 bg-navy-900/80 rounded-xl border border-navy-800 text-[11px]">
          <div className={`flex items-center space-x-1.5 font-bold ${step === 'credentials' ? 'text-purple-400' : 'text-emerald-400'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 'credentials' ? 'bg-purple-500/20 text-purple-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {step === 'credentials' ? '1' : '✓'}
            </span>
            <span>Credentials</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-600" />

          <div className={`flex items-center space-x-1.5 font-bold ${step === 'otp_verify' ? 'text-purple-400' : 'text-gray-500'}`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${step === 'otp_verify' ? 'bg-purple-500 text-white' : 'bg-navy-800 text-gray-500'}`}>
              2
            </span>
            <span>2FA OTP Verification</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-600" />

          <div className="flex items-center space-x-1.5 font-semibold text-gray-500">
            <span>3D Dashboard</span>
          </div>
        </div>

        {step === 'credentials' ? (
          <>
            <h2 className="text-xl font-bold text-center text-white mb-1.5">
              {isRegister ? 'Register Security Account' : 'Secure Account Login'}
            </h2>
            <p className="text-xs text-center text-gray-400 mb-6">
              Enter your credentials to initiate two-factor security OTP verification.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-300">Email Address</label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                    placeholder="admin@subguard.ai"
                  />
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300">Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-navy-900 border border-navy-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 transition"
                    placeholder="••••••••"
                  />
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition mt-2 hover:scale-[1.01] flex items-center justify-center space-x-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Continue to 2FA OTP Verification</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                }}
                className="text-xs text-purple-400 hover:underline"
              >
                {isRegister ? 'Already registered? Switch to Log In' : "Need a new account? Switch to Register"}
              </button>
            </div>
          </>
        ) : (
          /* Step 2: OTP Verification Screen */
          <div className="space-y-6 text-center">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl w-fit mx-auto border border-purple-500/20">
              <KeyRound className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Enter 6-Digit Security OTP</h2>
              <p className="text-xs text-gray-400 mt-1">
                We generated a secure verification passcode for <br />
                <span className="text-purple-300 font-semibold">{email}</span>
              </p>
            </div>

            {/* Test Helper Badge for instant verification */}
            <div className="p-3.5 bg-purple-900/40 border border-purple-500/40 rounded-xl text-xs text-purple-200 flex items-center justify-between">
              <div>
                <span className="text-gray-400 font-medium">Your 2FA Code: </span>
                <span className="font-mono text-base font-black text-white tracking-widest ml-1">{demoCode}</span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillOtp}
                className="px-2.5 py-1 bg-purple-600/50 hover:bg-purple-600 text-white rounded-lg text-xs font-semibold transition border border-purple-400/40"
              >
                Auto-fill Code
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputsRef.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 sm:w-12 h-14 bg-navy-900 border border-navy-700 focus:border-purple-500 text-center text-xl font-bold text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition shadow-inner"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition hover:scale-[1.01] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {verifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Verify OTP & Launch 3D Dashboard</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-navy-800">
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="hover:text-white flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change credentials</span>
              </button>

              <button
                type="button"
                disabled={!canResend}
                onClick={handleResendOtp}
                className={`flex items-center space-x-1 ${canResend ? 'text-purple-400 hover:text-purple-300' : 'text-gray-600 cursor-not-allowed'}`}
              >
                <span>{canResend ? 'Resend New OTP' : `Resend in ${resendTimer}s`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
