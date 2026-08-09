'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ILibraryRepository } from '../../domain/repositories/ILibraryRepository';
import { MemoryLibraryRepository } from '../../data/mock/MemoryLibraryRepository';
import { PowerSyncLibraryRepository } from '../../data/powersync/PowerSyncLibraryRepository';
import { PowerSyncDatabase } from '@powersync/web';
import { AppSchema } from '../../data/powersync/AppSchema';
import { PowerSyncConnector } from '../../data/powersync/PowerSyncConnector';

const LibraryContext = createContext<ILibraryRepository | null>(null);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [repository, setRepository] = useState<ILibraryRepository | null>(null);

  useEffect(() => {
    const db = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: 'edumynt.sqlite' } });
    db.init().then(async () => {
      const connector = new PowerSyncConnector();
      await db.connect(connector);
      setRepository(new PowerSyncLibraryRepository(db) as unknown as ILibraryRepository);
    }).catch(err => {
      console.error('Failed to init PowerSync, falling back to Memory', err);
      setRepository(new MemoryLibraryRepository());
    });
  }, []);

  if (!repository) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-zinc-500 animate-pulse text-lg">Connecting to library...</div>
      </div>
    );
  }

  return (
    <LibraryContext.Provider value={repository}>
      {children}
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
