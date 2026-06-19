import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo, isAuthoredByUser } from "../../lib/utils";
import styles from "./QuestionCard.module.css";

export default function QuestionCard({ question }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOwn = isAuthoredByUser(question, user);

  const initials = `${question.author?.firstName?.[0] ?? ""}${
    question.author?.lastName?.[0] ?? ""
  }`.toUpperCase();

  const authorName = isOwn
    ? "You"
    : `${question.author?.firstName ?? ""} ${question.author?.lastName ?? ""}`.trim();

  const replyCount = question.replyCount ?? question.answerCount ?? 0;

  return (
    <article
      className={`${styles.card} ${isOwn ? styles.cardOwn : ""}`}
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
      {/* Badge is absolute — lives outside the header row */}
      {isOwn && <span className={styles.card__badge}>YOURS</span>}

      <div className={styles.card__avatar}>{initials || "?"}</div>

      <div className={styles.card__body}>
        {/* header has right padding so title never slides under the badge */}
        <div className={styles.card__header}>
          <h4 className={styles.card__title}>{question.title}</h4>
        </div>

        {question.content && (
          <p className={styles.card__description}>{question.content}</p>
        )}

        <div className={styles.card__meta}>
          <span className={styles.card__metaItem}>
            <MessageSquare size={14} />
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
