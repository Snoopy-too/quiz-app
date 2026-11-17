import QuizEditor from "./QuizEditor";

export default function EditQuiz({ setView, quizId, appState }) {
  return <QuizEditor quizId={quizId} setView={setView} appState={appState} />;
}
