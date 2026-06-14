import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { apiClient } from "../../services/core/api.client";
import "./Dashboard.module.css";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const debounceTimer = useRef(null);

  // --- Core Application States ---
  const [questions, setQuestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("keyword"); // 'keyword' | 'semantic'
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quick snapshot metric figures matching dashboard layouts
  const [stats, setStats] = useState({
    total: 0,
    replies: 0,
    unanswered: 0,
    yours: 0,
  });

  // --- Relative Timestamp Formatter ---
  const timeAgo = (timestamp) => {
    if (!timestamp) return "1 month ago";
    const now = new Date();
    const past = new Date(timestamp);
    const msPerMinute = 60 * 1000;
    const msPerHour = msPerMinute * 60;
    const msPerDay = msPerHour * 24;
    const msPerMonth = msPerDay * 30;
    const msPerYear = msPerDay * 365;

    const elapsed = now - past;

    if (elapsed < msPerMinute) return "Just now";
    if (elapsed < msPerHour)
      return `${Math.round(elapsed / msPerMinute)} minutes ago`;
    if (elapsed < msPerDay)
      return `${Math.round(elapsed / msPerHour)} hours ago`;
    if (elapsed < msPerMonth)
      return `${Math.round(elapsed / msPerDay)} days ago`;
    if (elapsed < msPerYear) {
      const months = Math.round(elapsed / msPerMonth);
      return `${months} ${months === 1 ? "month" : "months"} ago`;
    }
    return `${Math.round(elapsed / msPerYear)} years ago`;
  };

  // --- Stable Initials Avatar Color Assignment ---
  const getAvatarStyles = (authorName) => {
    const name = authorName || "String String";
    const parts = name.trim().split(" ");
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Controlled pastel color palette configurations matching standard layout viewports
    const hues = [142, 200, 280, 340, 24, 190];
    const chosenHue = hues[Math.abs(hash) % hues.length];

    return {
      initials,
      style: {
        backgroundColor: `hsl(${chosenHue}, 75%, 85%)`,
        color: `hsl(${chosenHue}, 85%, 25%)`,
      },
    };
  };

  // --- API Request Interceptor ---
  const fetchDashboardFeed = useCallback(
    async (query = "", mode = searchMode, skipInitialSync = false) => {
      if (!skipInitialSync) {
        setIsLoading(true);
        setError(null);
      }
      try {
        let activeDataset = [];
        const cleanQuery = query.trim();

        if (!cleanQuery) {
          const response = await apiClient.get("/questions/search", {
            params: { query: " ", k: 10, threshold: 0.3 },
          });
          activeDataset = response.data?.data || [];
        } else if (mode === "keyword" || mode === "semantic") {
          const response = await apiClient.get("/questions/search", {
            params: { query: cleanQuery, k: 10, threshold: 0.3 },
          });
          activeDataset = response.data?.data || [];
        }

        setQuestions(activeDataset);

        // Recalculate metrics snapshot summary boxes dynamically
        setStats({
          total: activeDataset.length,
          replies: activeDataset.reduce(
            (sum, item) => sum + (item.answerCount || 0),
            0,
          ),
          unanswered: activeDataset.filter(
            (item) => !item.answerCount || item.answerCount === 0,
          ).length,
          yours: activeDataset.filter(
            (item) =>
              item.userId === user?.id ||
              item.authorId === user?.id ||
              item.isMine,
          ).length,
        });
      } catch (err) {
        console.error("API Fetch Error: ", err);
        setError("Failed to load questions.");
      } finally {
        setIsLoading(false);
      }
    },
    [searchMode, user?.id],
  );

  // Initial mount trigger
  useEffect(() => {
    fetchDashboardFeed("", searchMode, true);
  }, [fetchDashboardFeed, searchMode]);

  // Handle Search input change with 400ms debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchDashboardFeed(val, searchMode);
    }, 400);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    fetchDashboardFeed(searchQuery, searchMode);
  };

  const handleToggleMode = (mode) => {
    setSearchMode(mode);
    fetchDashboardFeed(searchQuery, mode);
  };

  return (
    <div className="dashboard-layout-container">
      {/* Top Header Navigation Search Area */}
      <div className="dashboard-search-header">
        <form onSubmit={handleFormSubmit} className="search-input-form">
          <input
            type="text"
            className="search-bar-input"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search questions by keyword..."
          />
          <div className="search-mode-toggles">
            <button
              type="button"
              className={`toggle-btn ${searchMode === "keyword" ? "active" : ""}`}
              onClick={() => handleToggleMode("keyword")}
            >
              Keyword
            </button>
            <button
              type="button"
              className={`toggle-btn ${searchMode === "semantic" ? "active" : ""}`}
              onClick={() => handleToggleMode("semantic")}
            >
              Semantic
            </button>
          </div>
        </form>
      </div>

      {/* Main Operational Dashboard Content Card */}
      <div className="dashboard-main-card">
        <span className="forum-home-tag">FORUM HOME</span>
        <h1 className="welcome-heading">
          {user?.firstName
            ? `Good to see you, ${user.firstName}.`
            : "Welcome to the forum."}
        </h1>
        <p className="welcome-subtext">
          Start a topic, revisit your own threads, or skim the live feed. Search
          above works from any page once you are back on Home.
        </p>

        {/* Quick-Actions Grid Elements */}
        <div className="quick-actions-row">
          <div
            className="action-card"
            onClick={() => navigate("/questions/ask")}
          >
            <div className="icon-wrapper edit-orange">📝</div>
            <div>
              <h3>New question</h3>
              <p>Share context, errors, and what you already tried</p>
            </div>
          </div>
          <div className="action-card">
            <div className="icon-wrapper data-blue">📊</div>
            <div>
              <h3>Your topics</h3>
              <p>Filtered list of threads you authored</p>
            </div>
          </div>
          <div className="action-card">
            <div className="icon-wrapper book-green">📖</div>
            <div>
              <h3>Knowledge base</h3>
              <p>Course library, uploads, and retrieval-backed context</p>
            </div>
          </div>
        </div>

        {/* Figures Status Subtext Info */}
        {isLoading ? (
          <p className="figures-caption loading-pulse">
            Loading snapshot for the list below...
          </p>
        ) : (
          <p className="figures-caption">
            Figures below describe the newest threads in this feed (up to 100
            from the API).
          </p>
        )}

        {/* Metric Figures Counters Area */}
        <div className="stats-counters-grid">
          <div className="counter-box">
            <span className="counter-label">Questions</span>
            <span className="counter-value">{isLoading ? 0 : stats.total}</span>
          </div>
          <div className="counter-box">
            <span className="counter-label">Replies</span>
            <span className="counter-value">
              {isLoading ? 0 : stats.replies}
            </span>
          </div>
          <div className="counter-box">
            <span className="counter-label">Unanswered</span>
            <span className="counter-value">
              {isLoading ? 0 : stats.unanswered}
            </span>
          </div>
          <div className="counter-box">
            <span className="counter-label">Yours</span>
            <span className="counter-value">{isLoading ? 0 : stats.yours}</span>
          </div>
        </div>
      </div>

      {/* Thread Feed Stream Container Card */}
      <div className="discussion-feed-card">
        <div className="feed-header">
          <div>
            <h2>Discussion feed</h2>
            <p>Your threads use a slim left accent in this list.</p>
          </div>
          <button
            type="button"
            className="newest-threads-badge"
            onClick={() => fetchDashboardFeed("", searchMode)}
          >
            NEWEST THREADS
          </button>
        </div>

        <div className="feed-content-area">
          {/* Loading View State Wrapper */}
          {isLoading && (
            <div className="feed-loading-wrapper">
              <p className="feed-loading-text">Loading recent questions...</p>
            </div>
          )}

          {/* Critical Layout Error Warning Block */}
          {error && !isLoading && (
            <div className="feed-error-wrapper">
              <div className="feed-error-state">{error}</div>
            </div>
          )}

          {/* Clean Dashboard Empty State View Component */}
          {!isLoading && !error && questions.length === 0 && (
            <div className="feed-empty-wrapper">
              <div className="feed-empty-state">
                <p>No questions found. Be the first to ask!</p>
              </div>
            </div>
          )}

          {/* Populated Threads Feed Stream Row Mappings */}
          {!isLoading && !error && questions.length > 0 && (
            <div className="questions-feed-list">
              {questions.map((question) => {
                const isOwnQuestion =
                  question.userId === user?.id ||
                  question.authorId === user?.id ||
                  question.isMine;
                const avatarData = getAvatarStyles(question.author);

                return (
                  <div
                    key={question.questionHash || question.id}
                    className={`question-feed-item ${isOwnQuestion ? "own-thread" : ""}`}
                    onClick={() =>
                      navigate(`/questions/${question.questionHash}`)
                    }
                  >
                    <div className="question-avatar-col">
                      <div
                        className={`avatar-circle ${isOwnQuestion ? "own-avatar-override" : ""}`}
                        style={!isOwnQuestion ? avatarData.style : {}}
                      >
                        {isOwnQuestion
                          ? user?.firstName?.slice(0, 2)?.toUpperCase() || "ME"
                          : avatarData.initials}
                      </div>
                    </div>

                    <div className="question-body-col">
                      <div className="question-title-row">
                        <h4>{question.title}</h4>
                        {isOwnQuestion && (
                          <span className="yours-badge">YOURS</span>
                        )}
                      </div>
                      <p className="question-description-preview">
                        {question.description ||
                          question.content ||
                          "No description provided."}
                      </p>

                      <div className="question-item-footer">
                        <span className="footer-meta-item">
                          <span className="icon-gap">💬</span>{" "}
                          {question.answerCount || 0}{" "}
                          {question.answerCount === 1 ? "reply" : "replies"}
                        </span>
                        <span className="footer-meta-item">
                          {timeAgo(question.createdAt || question.timestamp)} by{" "}
                          <span className="footer-author-highlight">
                            {question.author || "new user"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
