import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  getQuestionDetail,
  assessAnswerFit,
} from "../../services/question.service";
import { postAnswer } from '../../services/answer.service';
import { useAuth } from '../../contexts/AuthContext';
import styles from './QuestionDetail.module.css';


// import { questionService, getQuestionDetail } from "../../services/questions/question.service";
// // import {} getQuestionDetail from "../../services/question.service"

const QuestionDetail = () => {
  const { questionHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
// State variables
  const [loading, setLoading] = useState(true);
  // Question will be stored as { id, title, content, createdAt, author: { id, firstName, lastName } }
  const [question, setQuestion] = useState(null);
  // Answers will be stored as an array of { id, content, createdAt, author: { id, firstName, lastName } }
  const [answers, setAnswers] = useState([]);
  // For posting new answer
  const [answerText, setAnswerText] = useState('');
  // For AI fit check
  const [submitting, setSubmitting] = useState(false);
  // AI fit check loading state
  const [fitLoading, setFitLoading] = useState(false);
  // AI fit result will be stored as { level: 'good' | 'average' | 'poor', note: string }
  const [fitResult, setFitResult] = useState(null);
  //
  const [error, setError] = useState(null);
  //
  const [postError, setPostError] = useState(null);

  // Check if current user is the question author
  const isOwnQuestion = user?.id === question?.author?.id;

  // Fetch question and answers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getQuestionDetail(questionHash);
        setQuestion(data.question);
        setAnswers(data.answers);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to load question');
        if (err.response?.status === 404) {
          navigate('/not-found', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [questionHash, navigate]);

  // Handle answer submission
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

   // Backend returns array of all answers, get the newly added one (last in array)
   const answersArray = response.data;
   const answer = answersArray[answersArray.length - 1];

   const newAnswer = {
     id: answer.id,
     content: answer.content,
     createdAt: answer.createdAt,
     author: answer.author || {
       firstName: "Unknown",
       lastName: "",
     },
   };

   setAnswers((prev) => [...prev, newAnswer]);


    setAnswers((prev) => [...prev, newAnswer]);

    setAnswerText("");
    setFitResult(null);
  } catch (err) {
    console.log(err.response?.data);
    setPostError(err.response?.data?.message || "Failed to post answer");
  } finally {
    setSubmitting(false);
  }
};

  // AI Answer Fit check
  const handleCheckFit = async () => {
    if (answerText.trim().length < 20) {
      setPostError('Answer must be at least 20 characters to evaluate.');
      return;
    }
    if (isOwnQuestion) {
      setPostError('You cannot answer your own question.');
      return;
    }
    setFitLoading(true);
    setFitResult(null);
    try {
      const result = await assessAnswerFit(questionHash, answerText);
      setFitResult(result.data); // { level, note }
    } catch (err) {
      setPostError(err.response?.data?.message || 'AI evaluation failed');
    } finally {
      setFitLoading(false);
    }
  };
// Render logic
  if (loading) {
    return <div className={styles.loading}>Loading question...</div>;
  }

  if (error && !question) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      {/* Question Section */}
      <article className={styles.question}>
        <h1 className={styles.title}>{question.title}</h1>
        <div className={styles.meta}>
          <span className={styles.author}>
            Asked by {question.author.firstName} {question.author.lastName}
          </span>
          <span className={styles.date}>
            {new Date(question.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className={styles.content}>
          <ReactMarkdown>{question.content}</ReactMarkdown>
        </div>
      </article>

      {/* Answers Section */}
      <section className={styles.answersSection}>
        <h2>{answers.length} {answers.length === 1 ? 'Answer' : 'Answers'}</h2>
        <div className={styles.answersList}>
          {answers.map((answer) => (
            <div key={answer.id} className={styles.answerCard}>
              <div className={styles.answerMeta}>
                <span className={styles.answerAuthor}>
                  {answer.author.firstName} {answer.author.lastName}
                </span>
                <span className={styles.answerDate}>
                  {new Date(answer.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.answerContent}>
                <ReactMarkdown>{answer.content}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Post Answer Form (only if user is logged in and not the author) */}
      {user && !isOwnQuestion && (
        <section className={styles.postAnswerSection}>
          <h3>Your Answer</h3>
          <form onSubmit={handlePostAnswer}>
            <textarea
              className={styles.answerTextarea}
              rows="6"
              placeholder="Write your answer here... (minimum 20 characters)"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              disabled={submitting}
            />
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.checkFitButton}
                onClick={handleCheckFit}
                disabled={fitLoading || submitting}
              >
                {fitLoading ? 'Evaluating...' : 'Check Answer Fit'}
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
              >
                {submitting ? 'Posting...' : 'Post Answer'}
              </button>
            </div>
          </form>
          {postError && <div className={styles.errorMessage}>{postError}</div>}

          {/* AI Fit Feedback Panel */}
          {fitResult && (
            <div className={`${styles.fitPanel} ${styles[fitResult.level]}`}>
              <h4>AI Evaluation: {fitResult.level.toUpperCase()}</h4>
              <p>{fitResult.note}</p>
            </div>
          )}
        </section>
      )}

      {/* Show message if user is the question author */}
      {user && isOwnQuestion && (
        <div className={styles.ownQuestionNote}>
          You cannot answer your own question. You can edit it or wait for others to answer.
        </div>
      )}

      {/* Prompt to login if not authenticated */}
      {!user && (
        <div className={styles.loginPrompt}>
          Please <button onClick={() => navigate('/login')}>log in</button> to post an answer.
        </div>
      )}
    </div>
  );
};

export default QuestionDetail;