'use client';
import { useState, useEffect } from 'react';
import { useLibrary } from '../../../lib/providers/LibraryProvider';
import { useParams, useRouter } from 'next/navigation';
import { UserShelf } from '../../../domain/models/UserShelf';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { useProfileRepository } from '../../../lib/providers/LibraryProvider';
import { FollowButton } from '../../../components/ui/FollowButton';
import { clearTokens } from '../../../actions/auth';
import { ClientTokenStorage } from '../../../data/auth/ClientTokenStorage';
import { DirectusAuthRepository } from '../../../data/directus/DirectusAuthRepository';
export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const library = useLibrary();
  const profileRepo = useProfileRepository();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'shelves' | 'stats'>('shelves');
  const [publicShelves, setPublicShelves] = useState<UserShelf[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const [readingStats, setReadingStats] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleLogout = async () => {
    const tokenStorage = new ClientTokenStorage();
    const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8056';
    const authRepo = new DirectusAuthRepository(directusUrl, tokenStorage);
    try { await authRepo.logout(); } catch(e) {}
    await clearTokens();
    router.push('/login');
    router.refresh();
  };

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
      <div className="mb-12 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative">
        <div className="flex flex-col md:flex-row items-center gap-6 flex-1 text-center md:text-left">
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
        
        {/* Settings Icon */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-0 right-0 md:relative p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Settings"
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      <div className="mb-8">
        <FollowButton targetUsername={username} repository={profileRepo} />
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-bold">Settings</h2>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 max-w-2xl mx-auto w-full">
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Preferences</h3>
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="font-semibold text-lg">Dark Mode</div>
                  <div className="text-zinc-500 text-sm">Toggle application theme</div>
                </div>
                <button 
                  onClick={toggleDarkMode}
                  className={`w-14 h-8 rounded-full transition-colors relative ${isDarkMode ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Account</h3>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xl border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-left"
              >
                <div>
                  <div className="font-semibold text-lg">Log Out</div>
                  <div className="text-red-500/80 text-sm">Sign out of your account on this device</div>
                </div>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

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
