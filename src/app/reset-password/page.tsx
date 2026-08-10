'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authRepository } = useAuth();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
        <div className="w-full max-w-lg p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Request</h2>
          <p className="text-red-600 dark:text-red-400">Password reset token is missing from the URL.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!authRepository) {
      setStatus('error');
      setErrorMessage('Auth repository not initialized');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Check if authRepository has resetPassword method, otherwise fetch directly
      if ('resetPassword' in authRepository) {
        await (authRepository as any).resetPassword(token, password);
      } else {
        const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
        const response = await fetch(`${directusUrl}/auth/password/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.errors?.[0]?.message || 'Failed to reset password');
        }
      }
      
      setStatus('success');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'An error occurred while resetting your password.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-lg p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your new password below.</p>
        </div>
        
        {status === 'success' ? (
          <div className="space-y-6 text-center">
            <div className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Password Reset Successfully!</h3>
              <p className="text-sm">You can now login with your new password. Redirecting to login...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === 'error' && (
              <div className="text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required 
                className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)}
                required 
                className="border p-2.5 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-3 rounded-lg mt-2 transition-colors shadow-sm disabled:opacity-50"
            >
              {status === 'loading' ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
