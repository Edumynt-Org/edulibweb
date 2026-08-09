'use client';

import React from 'react';
import RegistrationForm from './RegistrationForm';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';

export default function RegisterPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleRegistration = async (data: any) => {
    setError(null);
    try {
      const tokenStorage = {
        getAccessToken: async () => null,
        getRefreshToken: async () => null,
        setTokens: async () => {},
        clearTokens: async () => {}
      }; // basic dummy for register since register doesn't set tokens in Directus by default (unless we login after)
      
      const authRepo = new DirectusAuthRepository('http://localhost:8056', tokenStorage);
      await authRepo.register(data.email, data.password, data.fullName, data.username);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-zinc-900 rounded shadow-md">
        <h1 className="text-2xl font-bold text-center">Register</h1>
        {error && <div className="text-red-500 bg-red-100 p-2 rounded">{error}</div>}
        {success ? (
          <div className="text-green-600 bg-green-100 p-4 rounded text-center">
            Registration successful! You can now log in.
          </div>
        ) : (
          <RegistrationForm onSubmit={handleRegistration} />
        )}
      </div>
    </div>
  );
}
