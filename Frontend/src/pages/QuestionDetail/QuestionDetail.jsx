import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sparkles, Share2, MessageSquare, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  getQuestionDetail,
  assessAnswerFit,
  getRelatedQuestions,
} from "../../services/questions/question.service";
import { postAnswer } from "../../services/answers/answer.service";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./QuestionDetail.module.css";

const QuestionDetail = () => {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const textareaRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fitLoading, setFitLoading] = useState(false);
  const [fitResult, setFitResult] = useState(null);
  const [error, setError] = useState(null);
  const [postError, setPostError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const isOwnQuestion = user?.id === question?.author?.id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Reset state immediately so stale data from the previous
        // question never flashes while the new one is loading
        setLoading(true);
        setQuestion(null);
        setAnswers([]);
        setRelatedQuestions([]);
        setAnswerText("");
        setFitResult(null);
        setPostError(null);
        setError(null);

        const response = await getQuestionDetail(questionHash);
        setQuestion(response.question);
        setAnswers(response.answers || []);
        setError(null);

        // Fetch related questions (optional, graceful fail)
        try {
          const related = await getRelatedQuestions(questionHash);
          setRelatedQuestions(related.data || []);
        } catch {
          // Related questions are non-critical
          setRelatedQuestions([]);
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load question");
        if (err.response?.status === 404) {
          navigate("/not-found", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [questionHash, navigate]);

  const handlePostAnswer = async (e) => {
    e.preventDefault();

    if (answerText.trim().length < 20) {
      setPostError("Answer must be at least 20 characters long.");
      return;
    }
    if (isOwnQuestion) {
      setPostError("You cannot answer your own question.");
      return;
    }

    try {
      setSubmitting(true);
      setPostError(null);

      const response = await postAnswer({
        questionId: question.id,
        content: answerText.trim(),
      });

      const answersArray = response.data;
      const answer = answersArray[answersArray.length - 1];

      setAnswers((prev) => [
        ...prev,
        {
          id: answer.id,
          content: answer.content,
          createdAt: answer.createdAt,
          author: answer.author || { firstName: "Unknown", lastName: "" },
        },
      ]);

      setAnswerText("");
      setFitResult(null);
    } catch (err) {
      setPostError(err.response?.data?.message || "Failed to post answer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckFit = async () => {
    if (answerText.trim().length < 20) {
      setPostError("Answer must be at least 20 characters to evaluate.");
      return;
    }
    if (isOwnQuestion) {
      setPostError("You cannot answer your own question.");
      return;
    }
    setFitLoading(true);
    setFitResult(null);
    try {
      const result = await assessAnswerFit(questionHash, answerText);
      setFitResult(result.data);
    } catch (err) {
      setPostError(err.response?.data?.message || "AI evaluation failed");
    } finally {
      setFitLoading(false);
    }
  };
  const insertMarkdown = (before, after, placeholder) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = answerText.substring(start, end);
    
    const textToInsert = selectedText || placeholder;
    const newText = 
      answerText.substring(0, start) + 
      before + textToInsert + after + 
      answerText.substring(end);
    
    setAnswerText(newText);
    
   
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };


  const getInitials = (firstName = "", lastName = "") =>
    `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "?";

  const avatarColor = (name = "") => {
    const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  };

  const handleShare = async () => {
    const url = window.location.href; 
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      
     
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };


  if (loading) {
    return (
      <div className={styles.pageLayout}>
        <div className={styles.mainColumn}>
          <div className={styles.skeleton}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonMeta}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonBody}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonBody}`} />
          </div>
        </div>
      </div>
    );
  }

  if (error && !question) {
    return <div className={styles.errorFull}>{error}</div>;
  }

  return (
    <div className={styles.pageLayout}>
      {/* Main content */}
      <div className={styles.mainColumn}>
        {/* Back nav */}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} />
          Back to feed
        </button>

        {/* Question card */}
        <article className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <div
              className={styles.avatar}
              style={{ background: avatarColor(question.author.firstName) }}
            >
              {getInitials(question.author.firstName, question.author.lastName)}
            </div>
            <div className={styles.questionMeta}>
              <span className={styles.authorName}>
                {question.author.firstName} {question.author.lastName}
              </span>
              <span className={styles.postedDate}>
                Posted {new Date(question.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <h1 className={styles.questionTitle}>{question.title}</h1>

          <div className={styles.questionBody}>
            <ReactMarkdown>{question.content}</ReactMarkdown>
          </div>

          <div className={styles.questionFooter}>
                      <button className={styles.footerBtn} onClick={handleShare}>
              <Share2 size={14} />
              {copySuccess ? 'Link Copied!' : 'Share'}
            </button>

            <button className={styles.footerBtn}>
              <MessageSquare size={14} />
              {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
            </button>
          </div>
        </article>

        {/* Answers */}
        <section className={styles.answersSection}>
          <h2 className={styles.sectionHeading}>
            Community Answers ({answers.length})
          </h2>

          {answers.length === 0 && (
            <div className={styles.emptyAnswers}>
              No answers yet. Be the first to help!
            </div>
          )}

          {answers.map((answer) => (
            <div key={answer.id} className={styles.answerCard}>
              <div className={styles.answerHeader}>
                <div
                  className={styles.avatarSm}
                  style={{ background: avatarColor(answer.author.firstName) }}
                >
                  {getInitials(answer.author.firstName, answer.author.lastName)}
                </div>
                <div>
                  <span className={styles.answerAuthor}>
                    {answer.author.firstName} {answer.author.lastName}
                  </span>
                  <span className={styles.answerDate}>
                    {new Date(answer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className={styles.answerBody}>
                <ReactMarkdown>{answer.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </section>

        {/* Post answer form */}
        {user && !isOwnQuestion && (
          <section className={styles.postAnswerSection}>
            <h3 className={styles.contributeHeading}>Contribute an answer</h3>
            <form onSubmit={handlePostAnswer}>
              {/* Markdown toolbar */}
                      <div className={styles.toolbar}>
                <div className={styles.toolbarActions}>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    title="Bold"
                    onClick={() => insertMarkdown("**", "**", "bold text")}
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    title="Italic"
                    onClick={() => insertMarkdown("_", "_", "italic text")}
                  >
                    <em>I</em>
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    title="Code"
                    onClick={() => insertMarkdown("`", "`", "code")}
                  >
                    {"</>"}
                  </button>
                  <button
                    type="button"
                    className={styles.toolbarBtn}
                    title="Link"
                    onClick={() => insertMarkdown("[", "](url)", "link text")}
                  >
                    🔗
                  </button>
                </div>
                <span className={styles.charCount}>
                  {answerText.length} characters
                </span>
              </div>

              <textarea
                ref={textareaRef}
                className={styles.answerTextarea}
                rows={7}
                placeholder="Write your answer here..."
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={submitting}
              />


              {/* Bottom action row */}
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.checkFitBtn}
                  onClick={handleCheckFit}
                  disabled={fitLoading || submitting}
                >
                  <Sparkles size={14} aria-hidden />
                  {fitLoading ? "Evaluating..." : "Check draft fit"}
                </button>
                <span className={styles.fitHint}>
                  Relevance only. Not grading correctness. You need at least 20 characters.
                </span>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? "Posting..." : "Post Answer"}
                </button>
              </div>
            </form>

            {postError && (
              <div className={styles.postError}>{postError}</div>
            )}

            {fitResult && (
              <div className={`${styles.fitPanel} ${styles[`fit_${fitResult.level}`]}`}>
                <span className={styles.fitBadge}>
                  AI Fit: {fitResult.level.toUpperCase()}
                </span>
                <p className={styles.fitNote}>{fitResult.note}</p>
              </div>
            )}
          </section>
        )}

        {user && isOwnQuestion && (
          <div className={styles.ownQuestionNote}>
            You cannot answer your own question. You can edit it or wait for
            others to answer.
          </div>
        )}

        {!user && (
          <div className={styles.loginPrompt}>
            Please{" "}
            <button onClick={() => navigate("/login")}>log in</button> to post
            an answer.
          </div>
        )}
      </div>

      {/* Right sidebar — Related Questions */}
      <aside className={styles.sidebar}>
        <h3 className={styles.sidebarHeading}>Related Questions</h3>
        <div className={styles.relatedList}>
          {relatedQuestions.length === 0 ? (
            <p className={styles.noRelated}>No related questions found.</p>
          ) : (
            relatedQuestions.map((q) => (
              <button
                key={q.id || q.questionHash}
                className={styles.relatedCard}
                onClick={() => navigate(`/question/${q.questionHash}`)}
              >
                <span className={styles.relatedTitle}>{q.title}</span>
                <div className={styles.relatedMeta}>
                  <span className={styles.relatedTag}>
                    {q.author?.firstName || "string"}{" "}
                    {q.author?.lastName || "string"}
                  </span>
                  <span className={styles.relatedDate}>
                    {q.createdAt
                      ? new Date(q.createdAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};

export default QuestionDetail;