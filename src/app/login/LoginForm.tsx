'use client';

import { useState } from 'react';
import { DirectusAuthRepository } from '../../data/directus/DirectusAuthRepository';
import { ClientTokenStorage } from '../../data/auth/ClientTokenStorage';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Setup the auth repository with token storage
      const tokenStorage = new ClientTokenStorage();
      const authRepo = new DirectusAuthRepository('http://localhost:8056', tokenStorage);
      
      await authRepo.login(email, password);
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Log In</h2>
      
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

      <div className="flex flex-col gap-1">
        <label htmlFor="email">Email</label>
        <input 
          id="email"
          type="email" 
          value={email} 
          onChange={e => setEmail(e.target.value)}
          required 
          className="border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password">Password</label>
        <input 
          id="password"
          type="password" 
          value={password} 
          onChange={e => setPassword(e.target.value)}
          required 
          className="border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
        />
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="mt-4 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
