import React, { useState, useEffect, useRef } from 'react';
import { AudioEdition } from '../../domain/models/AudioEdition';
import { AudioChapter } from '../../domain/models/AudioChapter';
import { useLibrary } from '../../lib/providers/LibraryProvider';
import { AudioProgress } from '../../domain/models/AudioProgress';

interface AudioPlayerProps {
  edition: AudioEdition;
  initialChapterIndex?: number;
}

export function AudioPlayer({ edition, initialChapterIndex = 0 }: AudioPlayerProps) {
  const library = useLibrary();
  const [currentChapterIndex, setCurrentChapterIndex] = useState(initialChapterIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);
  const [sleepTimerActive, setSleepTimerActive] = useState<boolean>(false);
  const [syncPromptPercent, setSyncPromptPercent] = useState<number | null>(null);
  const [syncHandled, setSyncHandled] = useState<boolean>(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeOutInterval = useRef<NodeJS.Timeout | null>(null);
  
  const currentChapter = edition.chapters[currentChapterIndex];

  useEffect(() => {
    // Load saved progress
    setSyncPromptPercent(null);
    setSyncHandled(false);

    if (currentChapter) {
      library.getAudioProgress(edition.bookId, currentChapter.id).then(progress => {
        if (progress && audioRef.current) {
          audioRef.current.currentTime = progress.positionSeconds;
          setPosition(progress.positionSeconds);
        } else if (currentChapter.linkedTextChapter && !syncHandled) {
          library.getChapterProgress(currentChapter.linkedTextChapter).then(textProgress => {
            if (textProgress && textProgress.progressPercent > 0) {
              setSyncPromptPercent(textProgress.progressPercent);
            }
          });
        }
      });
    }
  }, [currentChapter, edition.bookId, library]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setPosition(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    const saveProgress = () => {
      if (currentChapter) {
        library.saveAudioProgress({
          profileId: null, // the repository handles local current user mapping
          bookId: edition.bookId,
          audioChapterId: currentChapter.id,
          positionSeconds: Math.floor(audio.currentTime),
          durationSeconds: Math.floor(audio.duration || currentChapter.durationSeconds || 0),
          status: 'started',
          lastListenedAt: new Date(),
        });
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    
    // Periodically save progress
    const saveInterval = setInterval(saveProgress, 5000);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      clearInterval(saveInterval);
      saveProgress(); // save on unmount
    };
  }, [currentChapter, library, edition.bookId]);

  // Sleep Timer Tick
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sleepTimerActive && sleepTimerSeconds !== null && isPlaying) {
      timer = setInterval(() => {
        setSleepTimerSeconds(prev => {
          if (prev === null) return null;
          if (prev <= 4 && prev > 0) {
            // Fade out
            if (audioRef.current) {
              const newVolume = Math.max(0, audioRef.current.volume - 0.25);
              audioRef.current.volume = newVolume;
            }
          }
          if (prev <= 1) {
            setSleepTimerActive(false);
            setIsPlaying(false);
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.volume = 1.0; // Reset for next time
            }
            return null; // Timer finished
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [sleepTimerActive, sleepTimerSeconds, isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      // Note: HTML5 audio preserves pitch by default
      (audioRef.current as any).preservesPitch = true;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const nextTrack = () => {
    if (currentChapterIndex < edition.chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      setIsPlaying(true);
      if (sleepTimerSeconds === -1) {
        // End of chapter sleep timer triggered
        setIsPlaying(false);
        setSleepTimerActive(false);
        setSleepTimerSeconds(null);
        if (audioRef.current) audioRef.current.pause();
      }
    } else {
      setIsPlaying(false);
    }
  };

  const prevTrack = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      setIsPlaying(true);
    }
  };

  if (!currentChapter) return <div>No audio chapters found.</div>;

  const acceptSync = () => {
    if (audioRef.current && syncPromptPercent !== null) {
      const dur = duration || currentChapter.durationSeconds || 0;
      const newPos = dur * (syncPromptPercent / 100);
      audioRef.current.currentTime = newPos;
      setPosition(newPos);
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
    setSyncPromptPercent(null);
    setSyncHandled(true);
  };

  const dismissSync = () => {
    setSyncPromptPercent(null);
    setSyncHandled(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50">
      {syncPromptPercent !== null && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-2 text-sm flex items-center justify-between px-4 border-b border-blue-100 dark:border-blue-900">
          <span>Resume listening from your reading progress (~{syncPromptPercent}%)?</span>
          <div className="flex gap-2">
            <button onClick={acceptSync} className="text-blue-600 font-bold dark:text-blue-400">Yes</button>
            <button onClick={dismissSync} className="text-gray-500">No</button>
          </div>
        </div>
      )}
      <div className="p-4 max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4">
        <audio 
          ref={audioRef} 
          src={currentChapter.audioFileUrl} 
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={nextTrack}
        />
        
        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{currentChapter.title}</h3>
          <p className="text-sm text-gray-500 truncate">{edition.title}</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-center gap-4">
            <button onClick={prevTrack} disabled={currentChapterIndex === 0} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50">
              ⏮️
            </button>
            <button onClick={() => skip(-15)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-sm font-bold">
              -15s
            </button>
            <button 
              onClick={togglePlay}
              className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button onClick={() => skip(30)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-sm font-bold">
              +30s
            </button>
            <button onClick={nextTrack} disabled={currentChapterIndex === edition.chapters.length - 1} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full disabled:opacity-50">
              ⏭️
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-2 text-xs">
            <span>{Math.floor(position / 60)}:{(Math.floor(position % 60)).toString().padStart(2, '0')}</span>
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={position}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Number(e.target.value);
                  setPosition(Number(e.target.value));
                }
              }}
              className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span>{Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="flex items-center gap-2 text-xs mt-2 md:mt-0">
          <select 
            value={playbackRate} 
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            className="bg-gray-100 dark:bg-gray-800 border-none rounded p-1"
          >
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0].map(rate => (
              <option key={rate} value={rate}>{rate}x</option>
            ))}
          </select>
          
          <select
            value={sleepTimerSeconds === null ? '' : sleepTimerSeconds === -1 ? 'eoc' : sleepTimerSeconds}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setSleepTimerSeconds(null);
                setSleepTimerActive(false);
              } else if (val === 'eoc') {
                setSleepTimerSeconds(-1);
                setSleepTimerActive(true);
              } else {
                setSleepTimerSeconds(Number(val));
                setSleepTimerActive(true);
              }
              if (audioRef.current) audioRef.current.volume = 1.0;
            }}
            className="bg-gray-100 dark:bg-gray-800 border-none rounded p-1 max-w-[100px]"
          >
            <option value="">No Timer</option>
            <option value={15 * 60}>15 min</option>
            <option value={30 * 60}>30 min</option>
            <option value={60 * 60}>60 min</option>
            <option value="eoc">End of Chapter</option>
          </select>
          {sleepTimerActive && sleepTimerSeconds !== null && sleepTimerSeconds > 0 && (
            <span className="text-gray-500 min-w-[40px] text-right">
              {Math.floor(sleepTimerSeconds / 60)}:{(sleepTimerSeconds % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
