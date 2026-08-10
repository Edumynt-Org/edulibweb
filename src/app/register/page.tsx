'use client';

import React from 'react';
import RegistrationForm from './RegistrationForm';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';
import { useSyncConnector } from '../../lib/providers/LibraryProvider';

export default function RegisterPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const syncConnector = useSyncConnector();

  const handleRegistration = async (data: any) => {
    setError(null);
    try {
      const tokenStorage = {
        getAccessToken: async () => null,
        getRefreshToken: async () => null,
        setTokens: async () => {},
        clearTokens: async () => {}
      }; // dummy for register since register doesn't set tokens in Directus by default
      
      const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
      const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage, syncConnector);
      
      // Native register using first_name and last_name as requested
      await authRepo.register(data.email, data.password, data.firstName, data.lastName);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-black p-4">
      <div className="w-full max-w-lg p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create an Account</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Join our library community today.</p>
        </div>
        
        {error && (
          <div className="text-red-600 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="space-y-6 text-center">
            <div className="text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Registration successful!</h3>
              <p className="text-sm">Please check your email for the verification link before logging in.</p>
            </div>
          </div>
        ) : (
          <RegistrationForm onSubmit={handleRegistration} />
        )}
      </div>
    </div>
  );
}
