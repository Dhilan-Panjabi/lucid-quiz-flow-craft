import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuiz } from '@/context/QuizContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft } from 'lucide-react';
import { submitQuizResults, storeUserEmail, Result } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import WellbeingChart from './WellbeingChart';
import { usePostHog } from '@/context/PostHogContext';

type ResultGateProps = {
  quizId: string;
  quizTitle: string;
};

type QuizResult = {
  score: number;
  result: Result;
};

// Use Window interface augmentation to define amplitude (legacy)
declare global {
  interface Window {
    amplitude?: {
      track: (eventName: string, eventProperties: Record<string, string>) => void;
    };
  }
}

const ResultGate = ({ quizId, quizTitle }: ResultGateProps) => {
  const { visitorId, answers, goToPrevStep, utmParams, currentStep, userAgeRange } = useQuiz();
  const { track, identify, isFeatureEnabled, isReady: posthogIsReady, posthog } = usePostHog();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [skipTransitionScreens, setSkipTransitionScreens] = useState(true);
  const [shouldShowFinalResult, setShouldShowFinalResult] = useState(false);

  const featureFlagKey = 'require-email-for-quiz-result';
  const [showEmailForm, setShowEmailForm] = useState(() => {
    if (!posthogIsReady) return true;
    return isFeatureEnabled(featureFlagKey);
  });
  const [showWellbeingChart, setShowWellbeingChart] = useState(false);

  useEffect(() => {
    if (posthogIsReady) {
      const shouldShowForm = isFeatureEnabled(featureFlagKey);
      setShowEmailForm(shouldShowForm);

      const unsubscribe = posthog.onFeatureFlags(() => {
        setShowEmailForm(isFeatureEnabled(featureFlagKey));
      });
      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      }; 
    }
  }, [posthogIsReady, isFeatureEnabled, posthog, featureFlagKey]);

  useEffect(() => {
    if (posthogIsReady && !showEmailForm && !isSubmitting && !result && !showWellbeingChart) {
      handleSubmit(); 
    }
  }, [posthogIsReady, showEmailForm, isSubmitting, result, showWellbeingChart]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    const submissionEmail = showEmailForm ? email : '';

    try {
      let userId = null;
      if (submissionEmail) { 
        userId = await storeUserEmail(submissionEmail, visitorId);
        if (userId) {
          localStorage.setItem('user_email', submissionEmail);
          localStorage.setItem('user_id', userId);
          identify(visitorId, {
            email: submissionEmail,
            user_id: userId
          });
        }
      }
      
      const response: QuizResult = await submitQuizResults(
        quizId, 
        visitorId, 
        answers, 
        submissionEmail, 
        Object.fromEntries(
          Object.entries(utmParams).map(([key, value]) => [key, String(value)])
        ),
        userAgeRange
      );
      
      setResult(response.result);
      setScore(response.score);
      setShowEmailForm(false); 
      
      if (skipTransitionScreens) {
        setShowWellbeingChart(true);
      } else {
        setTimeout(() => {
          setShowWellbeingChart(true);
        }, 500);
      }
      
      track('quiz_results_processed', {
        visitor_id: visitorId,
        quiz_id: quizId,
        quiz_title: quizTitle,
        email: submissionEmail, 
        score: response.score,
        result_id: response.result.id,
        result_title: response.result.title,
        total_questions: answers.length,
        ...Object.fromEntries(
          Object.entries(utmParams).map(([key, value]) => [key, String(value)])
        )
      });
      
      try {
        if (typeof window !== 'undefined' && 'amplitude' in window) {
          window.amplitude?.track('quiz_results_processed', { 
            visitor_id: visitorId,
            quiz_id: quizId,
            email: submissionEmail, 
            ...Object.fromEntries(
              Object.entries(utmParams).map(([key, value]) => [key, String(value)])
            )
          });
        }
      } catch (analyticsError) {
        console.error('Analytics error:', analyticsError);
      }
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setResult({
        id: '',
        quiz_id: quizId,
        title: "Something went wrong",
        description: "We're having trouble generating your personalized results. Please try again later or contact support.",
        min_score: 0,
        max_score: 0,
        created_at: new Date().toISOString()
      });
      setScore(0);
      setShowEmailForm(false);
      setShowWellbeingChart(true);
      
      track('quiz_submission_error', {
        visitor_id: visitorId,
        quiz_id: quizId,
        quiz_title: quizTitle,
        email: submissionEmail
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    track('quiz_back_button_clicked', {
      visitor_id: visitorId,
      quiz_id: quizId,
      from_step: currentStep
    });
    
    if (currentStep === 0) {
      navigate('/');
    } else {
      goToPrevStep();
    }
  };

  const handleContinue = () => {
    track('checkout_navigation', {
      visitor_id: visitorId,
      quiz_id: quizId,
      quiz_title: quizTitle,
      source: 'wellbeing_chart',
      score: score !== null ? score : undefined,
      result_id: result?.id
    });
    
    setShouldShowFinalResult(true);
    navigate('/checkout');
  };

  return (
    <AnimatePresence mode="wait">
      {showEmailForm ? (
        <motion.div
          key="email-form"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="result-gate"
        >
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[#BC5867] mb-4">
              Almost there!
            </h2>
            <p className="text-[#BC5867] mb-6">
              Enter your email to receive your personalized {quizTitle} results.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Your email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#BC5867] hover:bg-[#a34857] text-white"
              >
                {isSubmitting ? 
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span> : 
                  'Get My Results'
                }
              </Button>
              
              <p className="text-xs text-gray-500 mt-2">
                We respect your privacy. Your email will never be shared.
              </p>
            </form>
            
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center border-[#BC5867] text-[#BC5867] hover:bg-[#bc586710]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
          </div>
        </motion.div>
      ) : isSubmitting && !skipTransitionScreens ? (
        <motion.div 
          key="loading-auto-submit"
          className="result-gate flex flex-col items-center justify-center p-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg className="animate-spin h-10 w-10 text-[#BC5867] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl font-semibold text-[#BC5867]">
            Creating your personalized Well-being Management plan...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This will just take a moment.
          </p>
        </motion.div>
      ) : showWellbeingChart ? (
        <motion.div 
          key="wellbeing-chart"
          className="result-gate"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
        >
          <WellbeingChart onContinue={handleContinue} />
        </motion.div>
      ) : shouldShowFinalResult ? (
        <motion.div
          key="result-content"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="result-gate"
        >
          <div className="result-content">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                Your {quizTitle} Results
              </h2>
              
              {result && (
                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold mb-2">{result.title}</h3>
                  
                  {score !== null && (
                    <div className="my-4 text-center">
                      <div className="inline-block p-4 bg-lucid-violet-600/10 rounded-full">
                        <div className="text-3xl font-bold text-lucid-violet-700">{score}</div>
                        <div className="text-sm text-lucid-violet-600">Your Score</div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-gray-700 mb-4">{result.description}</p>
                </div>
              )}
              
              <div className="mt-8 text-center">
                <Button 
                  className="bg-lucid-violet-600 hover:bg-lucid-violet-700 text-white"
                  onClick={() => window.location.href = '/'}
                >
                  Return Home
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          key="default-wellbeing-chart"
          className="result-gate"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
        >
          <WellbeingChart onContinue={handleContinue} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ResultGate;
