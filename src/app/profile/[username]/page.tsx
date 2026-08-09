'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../../lib/providers/LibraryProvider';
import { useParams, useRouter } from 'next/navigation';
import { UserShelf } from '../../../domain/models/UserShelf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const library = useLibrary();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'shelves' | 'stats'>('shelves');
  const [publicShelves, setPublicShelves] = useState<UserShelf[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const [readingStats, setReadingStats] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  useEffect(() => {
    loadProfileData();
  }, [username]);

  const loadProfileData = async () => {
    try {
      const shelves = await library.getPublicShelves(username);
      setPublicShelves(shelves);
      
      const streakCount = await library.getDailyStreakCount(username);
      setStreak(streakCount);

      const stats = await library.getReadingStats(username);
      setReadingStats(stats);

      const badges = await library.getUserAchievements(username);
      setAchievements(badges);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 max-w-7xl mx-auto flex justify-center"><div className="animate-pulse">Loading profile...</div></div>;
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl text-white font-bold uppercase shadow-lg shrink-0">
          {username.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight mb-2">{username}'s Profile</h1>
          <p className="text-zinc-500 text-lg mb-3">Public Bookshelves & Stats</p>
          <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
            {streak > 0 && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 rounded-lg w-fit">
                <span>🔥</span>
                <span>{streak} Day Streak</span>
              </div>
            )}
            {achievements.slice(0, 3).map((badge, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg" title={badge.description}>
                <span>{badge.badge_icon}</span>
                <span className="text-sm">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8">
        <button
          onClick={() => setActiveTab('shelves')}
          className={`pb-4 px-6 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'shelves' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
        >
          Public Shelves
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-4 px-6 font-semibold text-lg transition-colors border-b-2 ${activeTab === 'stats' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
        >
          Stats & Milestones
        </button>
      </div>

      {activeTab === 'shelves' && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2">
          {publicShelves.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <p className="text-zinc-500 font-medium">{username} hasn't made any shelves public yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {publicShelves.map(shelf => (
                <div 
                  key={shelf.id} 
                  className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 cursor-pointer hover:border-blue-500 transition-all hover:shadow-md group" 
                  onClick={() => router.push(`/library/shelves/${shelf.slug}`)}
                >
                  <h3 className="font-bold text-xl dark:text-white mb-2 group-hover:text-blue-500 transition-colors">{shelf.name}</h3>
                  <p className="text-zinc-500 line-clamp-3">{shelf.description || 'No description'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50">
              <h3 className="text-zinc-600 dark:text-zinc-400 font-medium mb-1">Books Finished</h3>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{readingStats?.totalBooksFinished || 0}</p>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/50">
              <h3 className="text-zinc-600 dark:text-zinc-400 font-medium mb-1">Pages Read</h3>
              <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{readingStats?.totalPagesRead || 0}</p>
            </div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border border-purple-100 dark:border-purple-900/50">
              <h3 className="text-zinc-600 dark:text-zinc-400 font-medium mb-1">Hours Listened</h3>
              <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{readingStats?.totalHoursListened || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
              <h3 className="text-lg font-bold mb-6">Pages Read by Month</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readingStats?.pagesByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="pages" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
              <h3 className="text-lg font-bold mb-6">Hours Listened by Month</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readingStats?.hoursByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.2} />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="hours" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-2xl font-bold mb-6">Achievement Badges</h3>
            {achievements.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-zinc-500 font-medium">No badges earned yet. Keep reading!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {achievements.map((badge, idx) => (
                  <div key={idx} className="p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-center flex flex-col items-center justify-center hover:shadow-md transition-shadow">
                    <div className="text-5xl mb-3">{badge.badge_icon || '🏆'}</div>
                    <h4 className="font-bold mb-1">{badge.name}</h4>
                    <p className="text-xs text-zinc-500">{badge.description}</p>
                    <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-wider">Earned {new Date(badge.awarded_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
