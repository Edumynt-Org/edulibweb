'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;

    if (useMemoryFallback) {
      setRepository(new MemoryLibraryRepository());
      setSyncConnector(new MemorySyncConnector());
      // Lazy load the fallback memory profile repository if needed, or simply let it fail gracefully
      return;
    }

    const initPowerSync = async () => {
      try {
        const db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: 'edumynt.sqlite' } });
        
        // Setup a connection timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timed out after 10 seconds.')), 10000);
        });

        // Initialize DB
        await db.init();
        
        const connector = new PowerSyncConnector();
        
        // Race the connection against the timeout
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

  if (error && (!repository || !syncConnector)) {
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
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-black space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <div className="text-gray-600 dark:text-gray-400 font-medium animate-pulse">Connecting to library...</div>
        <button 
          onClick={() => setUseMemoryFallback(true)}
          className="mt-8 text-sm text-blue-600 hover:text-blue-500 underline underline-offset-2"
        >
          Skip & Continue Offline
        </button>
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
