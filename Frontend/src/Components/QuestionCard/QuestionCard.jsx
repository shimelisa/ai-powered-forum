import { MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo, isAuthoredByUser } from "../../lib/utils";
import styles from "./QuestionCard.module.css";

/**
 * QuestionCard: reusable row for a single question, used on the Dashboard
 * and My Questions pages. Shows author initials, title, body preview,
 * reply count, relative time, and a "YOURS" badge for the current user's posts.
 */
export default function QuestionCard({ question }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initials = `${question.author?.firstName?.[0] ?? ""}${
    question.author?.lastName?.[0] ?? ""
  }`.toUpperCase();

  const authorName = isAuthoredByUser(question, user)
    ? "You"
    : `${question.author?.firstName ?? ""} ${question.author?.lastName ?? ""}`.trim();

  const replyCount = question.replyCount ?? question.answersCount ?? 0;

  return (
    <article
      className={styles.card}
      onClick={() => navigate(`/question/${question.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/question/${question.id}`);
        }
      }}
    >
      <div className={styles.card__avatar}>{initials || "?"}</div>

      <div className={styles.card__body}>
        <div className={styles.card__header}>
          <h4 className={styles.card__title}>{question.title}</h4>
          {isAuthoredByUser(question, user) && (
            <span className={styles.card__badge}>Yours</span>
          )}
        </div>

        <p className={styles.card__description}>{question.description}</p>

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
