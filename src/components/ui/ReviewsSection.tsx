'use client';

import { FormEvent, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAccessToken } from '../../actions/auth';
import { Review } from '../../domain/models/Review';
import { useLibrary } from '../../lib/providers/LibraryProvider';

const ratingSteps = Array.from({ length: 11 }, (_, index) => index / 2);

function profileIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    return typeof claims.profile === 'string'
      ? claims.profile
      : typeof claims.profile_id === 'string'
        ? claims.profile_id
        : typeof claims.id === 'string'
          ? claims.id
          : typeof claims.sub === 'string'
            ? claims.sub
            : null;
  } catch {
    return null;
  }
}

function StarRating({ rating }: { rating: number }) {
  return <span aria-label={`${rating} out of 5 stars`} className="text-amber-400">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>;
}

function ReviewCard({ review }: { review: Review }) {
  const [revealed, setRevealed] = useState(!review.containsSpoilers);
  return (
    <article className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${review.profileId}`} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold uppercase shadow-sm shrink-0 hover:opacity-80 transition-opacity">
            {review.profileId.charAt(0)}
          </Link>
          <div>
            <Link href={`/profile/${review.profileId}`} className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">
              Reader review
            </Link>
            <p className="text-xs text-zinc-500">{new Date(review.dateCreated).toLocaleDateString()}</p>
          </div>
        </div>
        <StarRating rating={review.rating} />
      </div>
      {review.title && <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">{review.title}</h4>}
      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full rounded-xl bg-zinc-900 px-4 py-5 text-center font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          ⚠️ Spoiler Alert — Tap to view review contents.
        </button>
      ) : (
        <div className="prose prose-zinc max-w-none dark:prose-invert"><ReactMarkdown>{review.body}</ReactMarkdown></div>
      )}
    </article>
  );
}

export function ReviewsSection({ bookId }: { bookId: string }) {
  const library = useLibrary();
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => setReviews(await library.getReviewsForBook(bookId));

  useEffect(() => {
    void loadReviews().catch(() => setError('Unable to load reviews right now.'));
    getAccessToken().then((accessToken) => {
      setToken(accessToken);
      if (accessToken && localStorage.getItem(`pending_review_${bookId}`) === 'open') {
        localStorage.removeItem(`pending_review_${bookId}`);
        setShowForm(true);
      }
    });
  }, [bookId, library]);

  const startReview = () => {
    if (token) {
      setShowForm(true);
      return;
    }
    setShowAuthModal(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const profileId = token ? profileIdFromToken(token) : null;
    if (!profileId) {
      setError('Please sign in again before submitting your review.');
      return;
    }
    if (rating === 0 || !body.trim()) {
      setError('Choose a rating and write your review before publishing.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await library.createReview({ profileId, bookId, rating, title: title.trim() || undefined, body: body.trim(), containsSpoilers });
      setShowForm(false);
      setRating(0);
      setTitle('');
      setBody('');
      setContainsSpoilers(false);
      await loadReviews();
    } catch {
      setError('Unable to publish your review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <aside className="md:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center h-fit">
        <h3 className="text-xl font-bold mb-2 dark:text-white">Community Rating</h3>
        <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-100 my-4">
          {reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '—'}
        </div>
        <div className="text-zinc-500 text-sm mb-8">Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}</div>
        <hr className="w-full border-zinc-200 dark:border-zinc-800 mb-8" />
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Share your thoughts</h4>
        <button type="button" onClick={startReview} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl transition-colors">Write a Review</button>
      </aside>
      <section className="md:col-span-2 space-y-4" aria-live="polite">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
        {reviews.length ? reviews.map((review) => <ReviewCard key={review.id} review={review} />) : <p className="rounded-2xl border border-zinc-200 p-6 text-zinc-500 dark:border-zinc-800">No reviews yet. Be the first to share your thoughts.</p>}
      </section>

      {showAuthModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900"><h3 className="mb-4 text-xl font-bold dark:text-white">Sign in to write a review</h3><p className="mb-6 text-zinc-600 dark:text-zinc-400">Create an account or sign in before sharing your rating with the community.</p><button type="button" onClick={() => { localStorage.setItem(`pending_review_${bookId}`, 'open'); router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); }} className="mb-3 w-full rounded-lg bg-blue-600 py-2 font-medium text-white">Sign In / Register</button><button type="button" onClick={() => setShowAuthModal(false)} className="w-full rounded-lg bg-zinc-100 py-2 font-medium dark:bg-zinc-800 dark:text-white">Cancel</button></div></div>}
      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900"><h3 className="mb-5 text-xl font-bold dark:text-white">Write a Review</h3><label className="mb-2 block text-sm font-medium dark:text-zinc-200">Rating: {rating.toFixed(1)} / 5</label><div className="mb-5 grid grid-cols-6 gap-2">{ratingSteps.map((step) => <button key={step} type="button" aria-pressed={rating === step} onClick={() => setRating(step)} className={`rounded-lg border px-2 py-2 text-sm ${rating === step ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/30' : 'border-zinc-300 dark:border-zinc-700 dark:text-zinc-200'}`}>{step.toFixed(1)}</button>)}</div><label className="mb-2 block text-sm font-medium dark:text-zinc-200">Title <span className="text-zinc-500">(optional)</span></label><input value={title} onChange={(event) => setTitle(event.target.value)} className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700 dark:text-white" /><label className="mb-2 block text-sm font-medium dark:text-zinc-200">Review (Markdown supported)</label><textarea required value={body} onChange={(event) => setBody(event.target.value)} rows={7} className="mb-4 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700 dark:text-white" /><label className="mb-6 flex items-center gap-2 text-sm dark:text-zinc-200"><input type="checkbox" checked={containsSpoilers} onChange={(event) => setContainsSpoilers(event.target.checked)} /> This review contains spoilers</label><div className="flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-lg bg-zinc-100 py-2 font-medium dark:bg-zinc-800 dark:text-white">Cancel</button><button disabled={isSaving} className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white disabled:opacity-60">{isSaving ? 'Publishing…' : 'Publish Review'}</button></div></form></div>}
    </div>
  );
}
