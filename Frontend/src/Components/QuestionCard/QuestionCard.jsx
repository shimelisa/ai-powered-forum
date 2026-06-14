/**
 * QuestionCard: Reusable card component for displaying questions in listings
 * Used in Dashboard and MyQuestions pages
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './QuestionCard.module.css';

export default function QuestionCard({ question }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    navigate(`/question/${question.questionHash}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Check if this is the current user's question
  const isOwnQuestion = question.author?.id === user?.id;

  // Get initials for avatar
  const getInitials = () => {
    const firstName = question.author?.firstName || '';
    const lastName = question.author?.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Get avatar background color based on initials
  const getAvatarColor = () => {
    const colors = [
      '#06b6d4', // cyan
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#f97316', // orange
      '#10b981', // green
      '#3b82f6', // blue
    ];
    const initials = getInitials();
    const charCode = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
    return colors[charCode % colors.length];
  };

  return (
    <div 
      className={`${styles.questionCard} ${isOwnQuestion ? styles.ownQuestion : ''}`} 
      onClick={handleClick}
    >
      {/* Avatar */}
      <div 
        className={styles.avatar}
        style={{ backgroundColor: getAvatarColor() }}
      >
        {getInitials()}
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        {/* Header with YOURS badge */}
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{question.title}</h3>
          {isOwnQuestion && (
            <span className={styles.yoursBadge}>YOURS</span>
          )}
        </div>

        {/* Question preview */}
        <p className={styles.cardPreview}>{question.content}</p>

        {/* Footer with replies and time */}
        <div className={styles.cardFooter}>
          <span className={styles.replies}>
            {question.answerCount || 0} {question.answerCount === 1 ? 'reply' : 'replies'}
          </span>
          <span className={styles.dot}>·</span>
          <span className={styles.timestamp}>
            {formatDate(question.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
