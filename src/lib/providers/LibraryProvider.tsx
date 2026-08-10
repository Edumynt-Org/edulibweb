'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ILibraryRepository } from '../../domain/repositories/ILibraryRepository';
import { MemoryLibraryRepository } from '../../data/mock/MemoryLibraryRepository';
import { PowerSyncLibraryRepository } from '../../data/powersync/PowerSyncLibraryRepository';
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from '../../data/powersync/AppSchema';
import { PowerSyncConnector } from '../../data/powersync/PowerSyncConnector';
import { ISyncConnector } from '../../domain/repositories/ISyncConnector';
import { PowerSyncSyncConnector } from '../../data/powersync/PowerSyncSyncConnector';
import { MemorySyncConnector } from '../../data/mock/MemorySyncConnector';

const LibraryContext = createContext<ILibraryRepository | null>(null);
const SyncConnectorContext = createContext<ISyncConnector | null>(null);
const ProfileRepositoryContext = createContext<import('../../domain/repositories/IProfileRepository').IProfileRepository | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [repository, setRepository] = useState<ILibraryRepository | null>(null);
  const [syncConnector, setSyncConnector] = useState<ISyncConnector | null>(null);
  const [profileRepo, setProfileRepo] = useState<import('../../domain/repositories/IProfileRepository').IProfileRepository | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useMemoryFallback, setUseMemoryFallback] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    if (useMemoryFallback) {
      setRepository(new MemoryLibraryRepository());
      setSyncConnector(new MemorySyncConnector());
      return;
    }

    const initPowerSync = async () => {
      try {
        const db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: 'edumynt.sqlite' } });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timed out after 10 seconds.')), 10000);
        });

        await db.init();
        
        const connector = new PowerSyncConnector();
        
        await Promise.race([
          db.connect(connector),
          timeoutPromise
        ]);

        if (!isMounted) return;

        setRepository(new PowerSyncLibraryRepository(db) as unknown as ILibraryRepository);
        
        const sConnector = new PowerSyncSyncConnector(db, connector);
        sConnector.connect();
        setSyncConnector(sConnector);

        const { PowerSyncProfileRepository } = await import('../../data/powersync/PowerSyncProfileRepository');
        setProfileRepo(new PowerSyncProfileRepository(db));
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to init PowerSync:', err);
        setError(err.message || 'Failed to connect to the library database.');
      }
    };

    initPowerSync();

    return () => { isMounted = false; };
  }, [useMemoryFallback]);

  const isAuthRoute = pathname === '/login' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/verify-email';

  if (error && (!repository || !syncConnector) && !isAuthRoute) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-black p-4 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-2 shadow-sm">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Connection Failed</h2>
        <p className="text-gray-500 max-w-md">{error}</p>
        <p className="text-sm text-gray-400 mt-2">The library synchronization server is currently unreachable.</p>
        
        <div className="flex gap-4 mt-8 pt-4 w-full max-w-sm">
          <button 
            onClick={() => { setError(null); window.location.reload(); }}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
          >
            Retry Connection
          </button>
          <button 
            onClick={() => setUseMemoryFallback(true)}
            className="flex-1 px-4 py-3 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg transition-colors font-medium"
          >
            Continue Offline
          </button>
        </div>
      </div>
    );
  }

  if (!repository || !syncConnector) {
    if (isAuthRoute) {
      return (
        <LibraryContext.Provider value={repository as any}>
          <SyncConnectorContext.Provider value={syncConnector as any}>
            <ProfileRepositoryContext.Provider value={profileRepo as any}>
              {children}
            </ProfileRepositoryContext.Provider>
          </SyncConnectorContext.Provider>
        </LibraryContext.Provider>
      );
    }

    return (
      <div className="flex h-screen bg-zinc-50 dark:bg-black overflow-hidden animate-pulse">
        {/* Sidebar Skeleton */}
        <div className="hidden md:flex flex-col w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-32 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full"></div>
            ))}
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-between">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-64"></div>
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-8"></div>
          </header>
          <main className="flex-1 p-6 overflow-hidden flex flex-col">
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-48 mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                <div key={i} className="flex flex-col space-y-3">
                  <div className="aspect-[2/3] bg-zinc-200 dark:bg-zinc-800 rounded-lg w-full"></div>
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
            
            <div className="mt-auto pt-6 flex justify-center">
              <button 
                onClick={() => setUseMemoryFallback(true)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-2 transition-colors"
              >
                Skip & Continue Offline
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <LibraryContext.Provider value={repository}>
      <SyncConnectorContext.Provider value={syncConnector}>
        <ProfileRepositoryContext.Provider value={profileRepo!}>
          {children}
        </ProfileRepositoryContext.Provider>
      </SyncConnectorContext.Provider>
    </LibraryContext.Provider>
  );
}

export function useLibrary(): ILibraryRepository {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}

export function useSyncConnector(): ISyncConnector {
  const context = useContext(SyncConnectorContext);
  if (!context) {
    throw new Error('useSyncConnector must be used within a LibraryProvider');
  }
  return context;
}

export function useProfileRepository(): import('../../domain/repositories/IProfileRepository').IProfileRepository {
  const context = useContext(ProfileRepositoryContext);
  if (!context) {
    throw new Error('useProfileRepository must be used within a LibraryProvider');
  }
  return context;
}
