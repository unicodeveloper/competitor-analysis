'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import CompetitorAnalysisForm from './components/CompetitorAnalysisForm';
import ResearchResults from './components/ResearchResults';
import Sidebar from './components/Sidebar';
import SignInModal from './components/SignInModal';
import { isSelfHostedMode } from '@/lib/mode';

interface User {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

function HomeContent() {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDiscordBanner, setShowDiscordBanner] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAuthSuccess, setShowAuthSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('https://');
  const [summaryText, setSummaryText] = useState('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelledRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();

  // Check if running in self-hosted mode
  const isSelfHosted = isSelfHostedMode();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Skip OAuth handling in self-hosted mode
    if (isSelfHosted) return;

    // Load user from localStorage
    const storedUser = localStorage.getItem('valyu_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('valyu_user');
      }
    }

    // Check if user just completed authentication
    const authStatus = searchParams.get('auth');
    if (authStatus === 'success') {
      setShowAuthSuccess(true);
      // Reload user from localStorage after successful auth
      const newUser = localStorage.getItem('valyu_user');
      if (newUser) {
        try {
          setUser(JSON.parse(newUser));
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      }
      // Hide success message after 5 seconds
      setTimeout(() => setShowAuthSuccess(false), 5000);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, [searchParams, isSelfHosted]);

  /**
   * Get authorization headers for API calls (only needed in valyu mode)
   */
  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (!isSelfHosted) {
      const accessToken = localStorage.getItem('valyu_access_token');
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }
    return headers;
  };

  const pollStatus = async (taskId: string) => {
    // Don't poll if cancelled
    if (cancelledRef.current) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`/api/competitor-analysis/status?taskId=${taskId}`, {
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        // Handle auth required error
        if (data.error === 'AUTH_REQUIRED') {
          setShowSignInModal(true);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsAnalyzing(false);
          return;
        }
        throw new Error(data.error || 'Failed to check status');
      }

      // Ignore results if cancelled during fetch
      if (cancelledRef.current) {
        return;
      }

      setAnalysisResult(data);

      // If completed, stop polling
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (data.status !== 'completed') {
          setIsAnalyzing(false);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
      // Don't stop polling on temporary errors
    }
  };

  const handleTaskCreated = (taskId: string) => {
    cancelledRef.current = false;
    setIsAnalyzing(true);
    setCurrentTaskId(taskId);

    // Poll immediately
    pollStatus(taskId);

    // Then poll every 10 seconds
    pollIntervalRef.current = setInterval(() => {
      pollStatus(taskId);
    }, 10000);
  };

  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setCurrentTaskId(null);
    setIsCancelling(false);
    // Clear form inputs
    setWebsiteUrl('https://');
    setSummaryText('');
  };

  const handleCancel = async () => {
    // Mark as cancelled immediately to ignore any in-flight poll results
    cancelledRef.current = true;

    if (!currentTaskId) {
      // If no task ID yet, just reset
      handleReset();
      return;
    }

    setIsCancelling(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };

      await fetch('/api/competitor-analysis/cancel', {
        method: 'POST',
        headers,
        body: JSON.stringify({ taskId: currentTaskId }),
      });
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
    // Reset state and go back to homepage regardless of API result
    handleReset();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-16 px-6 sm:px-8 lg:px-12">
      {/* Sidebar */}
      <Sidebar onSignInClick={() => setShowSignInModal(true)} user={user} />

      {/* Sign In Modal - only shown in valyu mode */}
      {!isSelfHosted && (
        <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
      )}

      {/* Authentication Success Notification - only in valyu mode */}
      {!isSelfHosted && showAuthSuccess && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-5 py-4 shadow-notion flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[var(--accent-green-bg)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--accent-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">
                Successfully signed in
              </div>
              <div className="text-xs text-[var(--foreground-secondary)]">
                Welcome to Valyu Competitor Analysis
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discord Banner - Minimal Notion style */}
      {showDiscordBanner && (
        <div className="fixed top-4 left-6 z-50">
          <a
            href="https://discord.gg/BhUWrFbHRa"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--discord)] hover:bg-[var(--discord-hover)] text-white rounded-md shadow-notion-sm transition-notion text-xs"
          >
            {/* Discord Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span className="font-medium">Join the Discord</span>

            {/* Close button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDiscordBanner(false);
              }}
              className="ml-0.5 p-0.5 hover:bg-white/20 rounded transition-notion"
              aria-label="Close"
            >
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </a>
        </div>
      )}

      <main className="max-w-6xl mx-auto">
        {/* Main Content */}
        {!isAnalyzing && !analysisResult ? (
          // Centered layout before analysis starts - Notion style with lots of whitespace
          <>
            {/* Header - Centered with Notion typography */}
            <div className="text-center mb-16 pt-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
                Competitor Analysis
              </h1>
              <p className="text-lg text-[var(--foreground-secondary)] max-w-2xl mx-auto leading-relaxed">
                Get comprehensive insights about any competitor with AI-powered deep research.
                Analyzes multiple sources to provide detailed reports on products, market positioning, and strategy.
              </p>
            </div>

            {/* Centered form */}
            <div className="flex justify-center">
              <CompetitorAnalysisForm
                onTaskCreated={handleTaskCreated}
                user={user}
                onSignInClick={() => setShowSignInModal(true)}
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                summaryText={summaryText}
                setSummaryText={setSummaryText}
                isAnalyzing={isAnalyzing}
              />
            </div>
          </>
        ) : (
          // Side by Side Layout after analysis starts
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pt-8">
            {/* Left Column - Header + Form */}
            <div className="w-full space-y-8 max-w-md mx-auto lg:mx-0 lg:ml-auto">
              {/* Header - Left aligned */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
                  Competitor Analysis
                </h1>
                <p className="text-[var(--foreground-secondary)] leading-relaxed">
                  Get comprehensive insights about any competitor with AI-powered deep research.
                </p>
              </div>

              {/* Form */}
              <CompetitorAnalysisForm
                onTaskCreated={handleTaskCreated}
                user={user}
                onSignInClick={() => setShowSignInModal(true)}
                websiteUrl={websiteUrl}
                setWebsiteUrl={setWebsiteUrl}
                summaryText={summaryText}
                setSummaryText={setSummaryText}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {/* Right Column - Results */}
            <div className="w-full max-w-2xl mx-auto lg:mx-0 lg:mr-auto">
              <ResearchResults
                result={analysisResult}
                isLoading={isAnalyzing && !analysisResult}
                onReset={handleReset}
                onCancel={handleCancel}
                isCancelling={isCancelling}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--background-secondary)] text-[var(--foreground-secondary)] text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Powered by Valyu Deep Research</span>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
