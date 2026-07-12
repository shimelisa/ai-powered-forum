import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { questionService } from "../../services/questions/question.service";
import QuestionCard from "../../Components/QuestionCard/QuestionCard";
import ui from "../../styles/pageStates.module.css";
import styles from "./MyQuestions.module.css";

/**
 * MyQuestions: shows only the questions authored by the current user.
 * Data: `questionService.getQuestions({ mine: true })`.
 */
export default function MyQuestions() {
  const [myQuestions, setMyQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMyQuestions() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await questionService.getQuestions({ mine: true });
        if (isMounted) setMyQuestions(data);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to fetch questions.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchMyQuestions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.myQuestions}>
      <section className={styles.myQuestions__panel}>
        <div className={styles.myQuestions__panelHeader}>
          <div>
            <p className={styles.myQuestions__eyebrow}>Your workspace</p>
            <h3 className={styles.myQuestions__heading}>Your topics</h3>
          </div>
          <Link to="/questions/ask" className={styles.myQuestions__newButton}>
            <Plus size={16} />
            New question
          </Link>
        </div>
        <p className={styles.myQuestions__description}>
          Only questions you created. <br />
          Open one to read answers or add follow-ups. <br />
          Rows use the same left accent as your threads on Home.
        </p>
      </section>

      <section className={styles.myQuestions__listPanel}>
        {isLoading && (
          <div className={ui["pageStates__message--loading"]}>
            Loading your questions...
          </div>
        )}

        {!isLoading && error && (
          <div className={ui["pageStates__message--error"]}>{error}</div>
        )}

        {!isLoading && !error && myQuestions.length === 0 && (
          <div className={ui["pageStates__message--empty"]}>
            You have not asked any questions yet. <br /> Use{" "}
            <Link to="/questions/ask">Ask a Question</Link> in the sidebar to
            start.
          </div>
        )}

        {!isLoading && !error && myQuestions.length > 0 && (
          <div className={styles.myQuestions__list}>
            {myQuestions.map((question) => (
              <QuestionCard key={question.id} question={question} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
