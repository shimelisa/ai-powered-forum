/**
 * Dashboard: Main page displaying all community questions with search and filtering.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Edit, MessageSquare, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { questionService } from '../../services/questions/question.service';
import QuestionCard from '../../components/QuestionCard/QuestionCard';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [questions, setQuestions]   = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;
  const [stats, setStats]           = useState({
    totalQuestions: 0,
    totalReplies:   0,
    unanswered:     0,
    yours:          0,
  });

  /*  Fetch all questions */
  const fetchQuestions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response      = await questionService.getQuestions({});
      const questionsList = response || [];
      setQuestions(questionsList);

      const totalReplies = questionsList.reduce((sum, q) => sum + (q.answerCount || 0), 0);
      const unanswered   = questionsList.filter(q => (q.answerCount || 0) === 0).length;
      const yours        = questionsList.filter(q => q.author?.id === user?.id).length;

      setStats({ totalQuestions: questionsList.length, totalReplies, unanswered, yours });
    } catch (err) {
      setError(err.message || 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);


  useEffect(() => {
  setCurrentPage(1);
}, [questions]);
  /*Search */
  const performSearch = useCallback(async (query, mode) => {
    if (!query.trim()) { fetchQuestions(); return; }

    setIsLoading(true);
    setError(null);

    try {
      let response;
      if (mode === 'keyword') {
        response = await questionService.getQuestions({ search: query });
      } else {
        response = await questionService.searchQuestionsSemantic(query);
      }
      setQuestions(response || []);
    } catch (err) {
      setError(err.message || 'Search failed');
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchQuestions]);

  /*  React to URL param changes */
  useEffect(() => {
    const keywordQuery  = searchParams.get('q');
    const semanticQuery = searchParams.get('semantic');

    if (semanticQuery)     performSearch(semanticQuery, 'semantic');
    else if (keywordQuery) performSearch(keywordQuery, 'keyword');
    else                   fetchQuestions();
  }, [searchParams, performSearch, fetchQuestions]);

  const handleClearSearch = () => navigate('/dashboard');

  const activeQuery = searchParams.get('q') || searchParams.get('semantic');

const indexOfLastQuestion = currentPage * questionsPerPage;
const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;

const currentQuestions = questions.slice(
  indexOfFirstQuestion,
  indexOfLastQuestion
);

const totalPages = Math.ceil(questions.length / questionsPerPage);


  /* Render */
  return (
    <div className={styles.dashboard}>

       {/* Hero */}
      {!activeQuery && (
        <div className={styles.heroSection}>
          <span className={styles.breadcrumb}>Forum Home</span>
          <h1 className={styles.heroTitle}>
            Good to see you, {user?.firstName || 'there'}.
          </h1>
          <p className={styles.heroSubtitle}>
            Start a topic, revisit your own threads, or skim the live feed.
            Search above works from any page once you are back on Home.
          </p>
        </div>
      )}

         {/* Action cards */}
      {!activeQuery && (
        <div className={styles.actionCards}>
          <div className={styles.actionCard} onClick={() => navigate('/questions/ask')}>
            <div className={styles.actionCardIcon}><Edit size={18} /></div>
            <div className={styles.actionCardContent}>
              <h3 className={styles.actionCardTitle}>New question</h3>
              <p className={styles.actionCardDesc}>Share context, errors, and what you already tried</p>
            </div>
          </div>

          <div className={styles.actionCard} onClick={() => navigate('/my-questions')}>
            <div className={styles.actionCardIcon}><MessageSquare size={18} /></div>
            <div className={styles.actionCardContent}>
              <h3 className={styles.actionCardTitle}>Your topics</h3>
              <p className={styles.actionCardDesc}>Filtered list of threads you authored</p>
            </div>
          </div>

          <div className={styles.actionCard} onClick={() => navigate('/rag-documents')}>
            <div className={styles.actionCardIcon}><BookOpen size={18} /></div>
            <div className={styles.actionCardContent}>
              <h3 className={styles.actionCardTitle}>Knowledge base</h3>
              <p className={styles.actionCardDesc}>Course library, uploads, and retrieval-backed content for threads</p>
            </div>
          </div>
        </div>
      )}


      {/* Stats bar */}
           {!isLoading && !error && !activeQuery && (
        <div className={styles.statsBar}>
          <p className={styles.statsDescription}>
            Figures below describe the newest threads in this feed (up to 100 from the API).
          </p>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Questions</div>
              <div className={styles.statValue}>{stats.totalQuestions}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Replies</div>
              <div className={styles.statValue}>{stats.totalReplies}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Unanswered</div>
              <div className={styles.statValue}>{stats.unanswered}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Yours</div>
              <div className={styles.statValue}>{stats.yours}</div>
            </div>
          </div>
        </div>
      )}

      {/* Discussion feed */}
      <div className={styles.discussionFeed}>
        <div className={styles.feedHeader}>
          <div>
            <h2 className={styles.feedTitle}>Discussion feed</h2>
            <p className={styles.feedSubtitle}>Your threads use a slim left accent in this list.</p>
          </div>
          <button className={styles.newestButton}>Newest threads</button>
        </div>

        <div className={styles.contentArea}>

          {/* Loading */}
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
              <div className={styles.skeletonCard} />
            </div>
          )}

          {/* Error */}
          {error && !isLoading && (
            <div className={styles.errorBanner}>
              <p className={styles.errorText}>{error}</p>
              <button className={styles.retryButton} onClick={fetchQuestions}>
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !error && questions.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Search size={48} /></div>
              <h2 className={styles.emptyTitle}>
                {activeQuery ? 'No questions found' : 'No questions yet'}
              </h2>
              <p className={styles.emptyText}>
                {activeQuery
                  ? 'Try a different search or browse all questions.'
                  : 'Be the first to ask a question in our community!'}
              </p>
              {activeQuery && (
                <button className={styles.emptyAction} onClick={handleClearSearch}>
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Questions */}
          {!isLoading && !error && questions.length > 0 && (
            <div className={styles.questionsList}>
              <p className={styles.resultCount}>
                {questions.length} question{questions.length !== 1 ? 's' : ''}
              </p>
              <div className={styles.cardsContainer}>
              {currentQuestions.map((question) => (
  <QuestionCard key={question.questionHash} question={question} />
))}
              </div>

             {totalPages > 1 && (
  <div className={styles.pagination}>
    
    <button
      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className={styles.pageBtn}
    >
      Previous
    </button>

    <div className={styles.pageNumbers}>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          onClick={() => setCurrentPage(num)}
          className={`${styles.pageBtn} ${
            currentPage === num ? styles.activePage : ""
          }`}
        >
          {num}
        </button>
      ))}
    </div>

    <button
      onClick={() =>
        setCurrentPage((p) => Math.min(p + 1, totalPages))
      }
      disabled={currentPage === totalPages}
      className={styles.pageBtn}
    >
      Next
    </button>

  </div>
)}
  

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
