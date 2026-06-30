import { useState, useRef } from "react";
import ReactMarkdown from 'react-markdown';
import { useNavigate } from "react-router-dom";
import {
  Send,
  Sparkles,
  CheckCircle2,
  Bold,
  Italic,
  Code,
  Link2,
} from "lucide-react";
import { questionService } from "../../services/questions/question.service";
import styles from "./PostQuestion.module.css";

export default function PostQuestion() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);

  // Form state tracking
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });

  // Operation loading state triggers
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoaching, setIsCoaching] = useState(false);

  // AI Coach Flyout feedback tracking states
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [showCoach, setShowCoach] = useState(false);

  // Conditional App Views & Navigation tracking states
  const [error, setError] = useState(null);
  const [isPostedSuccessfully, setIsPostedSuccessfully] = useState(false);
  const [newQuestionId, setNewQuestionId] = useState(null);

  // Monitor text modifications on controlled input fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Remove past validation alerts on new keypress strokes
    if (error) setError(null);
  };

  // Wraps/inserts markdown syntax around the current textarea selection
  const applyMarkdownFormat = (type) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);

    let before = "";
    let after = "";
    let placeholder = "";

    switch (type) {
      case "bold":
        before = "**";
        after = "**";
        placeholder = "bold text";
        break;
      case "italic":
        before = "_";
        after = "_";
        placeholder = "italic text";
        break;
      case "code":
        if (selectedText.includes("\n")) {
          before = "```\n";
          after = "\n```";
          placeholder = "code";
        } else {
          before = "`";
          after = "`";
          placeholder = "code";
        }
        break;
      case "link":
        before = "[";
        after = "](https://)";
        placeholder = "link text";
        break;
      default:
        return;
    }

    const textToWrap = selectedText || placeholder;
    const newValue =
      value.slice(0, selectionStart) +
      before +
      textToWrap +
      after +
      value.slice(selectionEnd);

    setFormData((prev) => ({ ...prev, content: newValue }));

    // Restore focus and selection after React re-renders the value
    requestAnimationFrame(() => {
      textarea.focus();
      if (selectedText) {
        // Keep the wrapped text selected
        const start = selectionStart + before.length;
        const end = start + textToWrap.length;
        textarea.setSelectionRange(start, end);
      } else if (type === "link") {
        // Place cursor inside the (https://) so the user can type the URL
        const urlStart =
          selectionStart + before.length + placeholder.length + 2;
        const urlEnd = urlStart + "https://".length;
        textarea.setSelectionRange(urlStart, urlEnd);
      } else {
        // Select the inserted placeholder text so typing replaces it
        const start = selectionStart + before.length;
        const end = start + placeholder.length;
        textarea.setSelectionRange(start, end);
      }
    });
  };

  const validateForm = () => {
    const titleTrimmed = formData.title.trim();
    const contentTrimmed = formData.content.trim();

    if (!titleTrimmed) {
      setError("Title is required.");
      return false;
    }
    if (titleTrimmed.length < 5) {
      setError("Title must be at least 5 characters.");
      return false;
    }
    if (!contentTrimmed) {
      setError("Question content is required.");
      return false;
    }
    if (contentTrimmed.length < 10) {
      setError("Question content must be at least 10 characters.");
      return false;
    }
    return true;
  };

  // Contact AI Coaching endpoint for copy improvements
  const handleGetFeedback = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsCoaching(true);
    setError(null);

    try {
      const response =
        await questionService.generateQuestionDraftCoach(formData);
      setCoachFeedback(response.data || response);
      setShowCoach(true);
    } catch (err) {
      setError(err.message || "Failed to get AI feedback. Please try again.");
    } finally {
      setIsCoaching(false);
    }
  };

  // Submit final forum question draft payload to database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await questionService.createQuestion(formData);

      // Extract the questionHash from the nested data object
      const finalId =
        response.data?.questionHash ||
        response.questionHash ||
        response.data?.id ||
        response.id;
      setNewQuestionId(finalId);

      // Show success screen - NO automatic redirect, requires user click
      setIsPostedSuccessfully(true);
    } catch (err) {
      setError(err.message || "Failed to post question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset variables locally to write a brand new question card
  const handleAskAnother = () => {
    setFormData({ title: "", content: "" });
    setShowCoach(false);
    setCoachFeedback(null);
    setNewQuestionId(null);
    setIsPostedSuccessfully(false);
    setError(null);
  };

  return (
    <div className={styles.postQuestion}>
      {/* Structural Page Header Context Banner */}
      <div className={styles.postQuestion__header}>
        <span className={styles.postQuestion__breadcrumb}>ASK THE COHORT</span>
        <h1 className={styles.postQuestion__title}>Publish to the forum</h1>
        <p className={styles.postQuestion__subtitle}>
          Public threads help the whole cohort. Write as if a classmate will
          debug your issue tomorrow. They only know what you put on the page.
        </p>
      </div>

      {/* Conditionally Render Success Screen Canvas vs Standard Input Form Canvas */}
      {isPostedSuccessfully ? (
        <div className={styles.postQuestion__successCard}>
          <div className={styles.postQuestion__successBadge}>
            <CheckCircle2
              size={40}
              className={styles.postQuestion__successCheckIcon}
              aria-hidden
            />
          </div>
          <h2 className={styles.postQuestion__successTitle}>
            Thread published
          </h2>
          <p className={styles.postQuestion__successText}>
            Your post is indexed for keyword search and embedding-based
            similarity. Share the link in study groups, or stay on the thread to
            answer follow-up questions from peers.
          </p>

          {/* Explicit User Navigation Route Triggers */}
          <div className={styles.postQuestion__successActions}>
            <button
              type="button"
              className={styles.postQuestion__backToDashboardBtn}
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </button>

            <button
              type="button"
              className={styles.postQuestion__viewQuestionBtn}
              onClick={() => {
                if (newQuestionId) {
                  navigate(`/question/${newQuestionId}`);
                }
              }}
            >
              View Question
            </button>

            <button
              type="button"
              className={styles.postQuestion__askAnotherBtn}
              onClick={handleAskAnother}
            >
              Ask Another
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.postQuestion__container}>
          {/* Quality Control Guidelines Reference Ribbon Card */}
          <div className={styles.postQuestion__rulesCard}>
            <h3 className={styles.postQuestion__rulesCardTitle}>
              Write questions people can answer in one pass
            </h3>
            <p className={styles.postQuestion__rulesCardDesc}>
              Mentors volunteer their time. Give them runnable context, expected
              vs actual behavior, and a tight scope so they can reproduce the
              issue without guessing your setup.
            </p>

            <div className={styles.postQuestion__rulesSection}>
              <h4 className={styles.postQuestion__sectionHeading}>
                Checklist before you post
              </h4>
              <ul className={styles.postQuestion__rulesList}>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Title as a headline</strong> that states the symptom
                  and tech stack (e.g., “React 19: state resets after
                  navigation”).
                </li>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Repro steps</strong> numbered, with environment (OS,
                  browser, Node version) when it matters.
                </li>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Minimal code</strong> in fenced markdown blocks; trim
                  unrelated lines so readers scan faster.
                </li>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Exact errors</strong> copied verbatim, including stack
                  trace snippets when debugging backend routes.
                </li>
              </ul>
            </div>

            <div className={styles.postQuestion__rulesSection}>
              <h4 className={styles.postQuestion__sectionHeading}>
                Validation rules (enforced by the form)
              </h4>
              <ul className={styles.postQuestion__rulesList}>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Title length:</strong> Must be between 5 and 255
                  characters.
                </li>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Body length:</strong> Must contain a minimum of 10
                  characters detailing your problem.
                </li>
                <li className={styles.postQuestion__rulesItem}>
                  <strong>Single topic:</strong> Split unrelated bugs into
                  separate threads so search and embeddings stay precise.
                </li>
              </ul>
            </div>
          </div>

          {/* Form Processing Area Context Wrapper */}
          <div className={styles.postQuestion__formWrapper}>
            <form className={styles.postQuestion__form} onSubmit={handleSubmit}>
              {/* Question Title Inputs Area */}
              <div className={styles.postQuestion__formGroup}>
                <label
                  htmlFor="title"
                  className={styles.postQuestion__formLabel}
                >
                  Title
                </label>
                <p className={styles.postQuestion__fieldDesc}>
                  Be specific and imagine you&apos;re asking a question to
                  another person.
                </p>
                <input
                  id="title"
                  type="text"
                  name="title"
                  placeholder="e.g. How do I handle state management using Context API in React?"
                  className={styles.postQuestion__formInput}
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  maxLength={255}
                />
                <div className={styles.postQuestion__formHint}>
                  {formData.title.length}/255 characters
                </div>
              </div>

              {/* Main Text Markdown Canvas */}
              <div className={styles.postQuestion__formGroup}>
                <label
                  htmlFor="content"
                  className={styles.postQuestion__formLabel}
                >
                  What are the details of your problem?
                </label>
                <p className={styles.postQuestion__fieldDesc}>
                  Introduce the problem and expand on what you put in the title.
                  Minimum 10 characters.
                </p>

                <div className={styles.postQuestion__editorContainer}>
                  <div className={styles.postQuestion__editorToolbar}>
                    <button
                      type="button"
                      className={styles.postQuestion__toolbarBtn}
                      onClick={() => applyMarkdownFormat("bold")}
                      disabled={isSubmitting}
                      aria-label="Bold"
                      title="Bold"
                    >
                      <Bold size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.postQuestion__toolbarBtn}
                      onClick={() => applyMarkdownFormat("italic")}
                      disabled={isSubmitting}
                      aria-label="Italic"
                      title="Italic"
                    >
                      <Italic size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.postQuestion__toolbarBtn}
                      onClick={() => applyMarkdownFormat("code")}
                      disabled={isSubmitting}
                      aria-label="Code"
                      title="Code"
                    >
                      <Code size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.postQuestion__toolbarBtn}
                      onClick={() => applyMarkdownFormat("link")}
                      disabled={isSubmitting}
                      aria-label="Link"
                      title="Link"
                    >
                      <Link2 size={14} aria-hidden />
                    </button>
                    <span className={styles.postQuestion__editorCount}>
                      {formData.content.length} characters
                    </span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    id="content"
                    
                    name="content"
                    placeholder="Include all the information someone would need to answer your question... You can use Markdown to format your code!"
                    className={styles.postQuestion__formTextarea}
                    value={formData.content}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    rows={12}
                  />
                </div>
              </div>

              {/* Input Boundary Error Notifications Box */}
              {error && (
                <div className={styles.postQuestion__errorBox}>
                  <p className={styles.postQuestion__errorText}>{error}</p>
                </div>
              )}

              {/* Control Panel Actions Bar */}
              <div className={styles.postQuestion__actionFooter}>
                <div className={styles.postQuestion__aiActionGroup}>
                  <button
                    type="button"
                    className={`${styles.postQuestion__button} ${styles["postQuestion__button--secondary"]}`}
                    onClick={handleGetFeedback}
                    disabled={isCoaching || isSubmitting}
                  >
                    <Sparkles size={16} aria-hidden />
                    <span>
                      {isCoaching ? "Analyzing..." : "AI suggestions"}
                    </span>
                  </button>
                  <span className={styles.postQuestion__aiHelperText}>
                    Suggestions only. You still choose what to post.
                  </span>
                </div>

                <div className={styles.postQuestion__submissionGroup}>
                  <button
                    type="button"
                    className={styles.postQuestion__cancelBtn}
                    onClick={() => navigate("/dashboard")}
                    disabled={isSubmitting || isCoaching}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`${styles.postQuestion__button} ${styles["postQuestion__button--primary"]}`}
                    disabled={isSubmitting || isCoaching}
                  >
                    <span>
                      {isSubmitting ? "Publishing..." : "Post Question"}
                    </span>
                    <Send size={14} aria-hidden />
                  </button>
                </div>
              </div>
            </form>

            {/* AI Assistant Floating Coaching Dashboard */}
            {showCoach && coachFeedback && (
              <div className={styles.postQuestion__coachPanel}>
                <div className={styles.postQuestion__coachHeader}>
                  <div className={styles.postQuestion__coachTitleRow}>
                    <Sparkles
                      size={18}
                      className={styles.postQuestion__coachIcon}
                      aria-hidden
                    />
                    <h2 className={styles.postQuestion__coachTitle}>
                      AI Draft Coach Feedback
                    </h2>
                  </div>
                  <button
                    type="button"
                    className={styles.postQuestion__coachClose}
                    onClick={() => setShowCoach(false)}
                    aria-label="Close feedback panel"
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.postQuestion__coachContent}>
                  {coachFeedback.message && (
                    <p className={styles.postQuestion__coachMessage}>
                      {coachFeedback.message}
                    </p>
                  )}

                  {coachFeedback.tips && Array.isArray(coachFeedback.tips) && (
                    <div className={styles.postQuestion__tipsListBlock}>
                      <h3 className={styles.postQuestion__tipsTitle}>
                        Suggestions
                      </h3>
                      <ul className={styles.postQuestion__coachTips}>
                        {coachFeedback.tips.map((tip, index) => (
                          <li
                            key={index}
                            className={styles.postQuestion__coachTipItem}
                          >
                            <span className={styles.postQuestion__coachBullet}>
                              •
                            </span>
                            <span className={styles.postQuestion__coachTipText}>
                            <ReactMarkdown>{tip}</ReactMarkdown>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
