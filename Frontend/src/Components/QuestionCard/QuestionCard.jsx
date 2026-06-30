import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo, isAuthoredByUser } from "../../lib/utils";
import styles from "./QuestionCard.module.css";
import ReactMarkdown from "react-markdown"


export default function QuestionCard({ question }) {
  const navigate = useNavigate();
  const { user } = useAuth();


  // 1. Core utility check
  let isOwn = isAuthoredByUser(question, user);

  // 2. Fallback robust direct check if the utility fails
  if (!isOwn && user && question) {
    const currentUserId = user.id || user.userId;
    const authorId = question.author?.id || question.authorId || question.userId;
    
    if (currentUserId && authorId) {
      isOwn = String(currentUserId) === String(authorId);
    }
  }

  const initials = `${question.author?.firstName?.[0] ?? ""}${
    question.author?.lastName?.[0] ?? ""
  }`.toUpperCase();

  const authorName = isOwn
    ? "You"
    : `${question.author?.firstName ?? ""} ${question.author?.lastName ?? ""}`.trim();

  const replyCount = question.replyCount ?? question.answerCount ?? 0;

  return (
    <article
      // Using direct bracket notation to guarantee module string lookup
      className={`${styles.card} ${isOwn ? styles['cardOwn'] : ""}`}
      onClick={() => navigate(`/question/${question.questionHash}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/question/${question.questionHash}`);
        }
      }}
    >
<div className={styles.card__avatar}>
  <img
    src={`https://ui-avatars.com/api/?name=${question.author?.firstName || 'User'}+${question.author?.lastName || ''}&background=random&size=128`}
    alt={initials}
    referrerPolicy="no-referrer"
  />
</div>

      <div className={styles.card__body}>
        <div className={styles.card__header}>
          <h4 className={styles.card__title}>{question.title}</h4>
          {isOwn && <span className={styles['card__badge']}>YOURS</span>}
        </div>

        {question.content && (
          <div className={styles.card__description}>
            <ReactMarkdown>{question.content}</ReactMarkdown>
          </div>
        )}



        <div className={styles.card__meta}>
          <span className={styles.card__metaItem}>
            <MessageSquare size={13} />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          <span className={styles.card__metaItem}>
            {timeAgo(question.createdAt)} by {authorName}
          </span>
        </div>
      </div>
    </article>
  );
}