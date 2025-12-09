import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Users, Check } from "lucide-react";

export default function CreateTeam({ appState, setView, error, setError, onBack, isApproved }) {
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState("");
  const [classmates, setClassmates] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClassmates, setLoadingClassmates] = useState(true);
  const [teamCreated, setTeamCreated] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(null);

  const [quizPin, setQuizPin] = useState("");
  const [session, setSession] = useState(null);




  useEffect(() => {
    if (isApproved) {
      fetchClassmates();
    } else {
      setLoadingClassmates(false);
    }
  }, [isApproved]);

  const fetchClassmates = async () => {
    try {
      const teacherId = appState.currentUser?.teacher_id;

      if (!teacherId) {
        setError(t('errors.couldNotFindTeacher'));
        setLoadingClassmates(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("teacher_id", teacherId)
        .eq("role", "student")
        .eq("approved", true)
        .neq("id", appState.currentUser.id) // Exclude current user
        .order("name");

      if (fetchError) throw fetchError;

      setClassmates(data || []);
    } catch (err) {
      console.error("Error fetching classmates:", err);
      setError(t('errors.failedToLoadClassmates') + ": " + err.message);
    } finally {
      setLoadingClassmates(false);
    }
  };

  const verifyPin = async () => {
    if (!quizPin || quizPin.length !== 6) {
      setError(t('student.enterValid6DigitPIN'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: sessions, error: sessionError } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("pin", quizPin);

      if (sessionError) throw sessionError;

      if (!sessions || sessions.length === 0) {
        setError(t('errors.invalidPinQuizNotFound'));
        setLoading(false);
        return;
      }

      const foundSession = sessions[0];

      if (foundSession.status === 'completed') {
        setError(t('errors.quizAlreadyEnded'));
        setLoading(false);
        return;
      }

      // Optional: Enforce team mode?
      // User said "team mode quiz", implies checks.
      if (foundSession.mode !== 'team') {
        setError("This quiz is not in Team Mode. Please use 'Join Quiz' for individual mode.");
        setLoading(false);
        return;
      }

      setSession(foundSession);
    } catch (err) {
      console.error("Error verifying PIN:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      setError(t('student.pleaseEnterTeamName'));
      return;
    }

    if (selectedStudents.length === 0) {
      setError(t('student.pleaseSelectOneTeammate'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const teacherId = appState.currentUser?.teacher_id;

      // Create team
      const teamInsert = {
        name: teamName,
        teacher_id: teacherId
      };

      teamInsert.creator_id = appState.currentUser.id;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert(teamInsert)
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team creator as first member
      const teamMembers = [
        {
          team_id: team.id,
          student_id: appState.currentUser.id
        },
        // Add selected students
        ...selectedStudents.map(studentId => ({
          team_id: team.id,
          student_id: studentId
        }))
      ];

      // Join session immediately
      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: appState.currentUser.id,
          team_id: team.id,
          is_team_entry: true,
          score: 0
        })
        .select()
        .single();

      if (participantError) {
        console.error("Error joining session:", participantError);
        // If we fail to join, we should probably alert user, but the team IS created.
        // We can try to redirect anyway? Or throw?
        throw participantError;
      }

      setCreatedTeam(team);
      setTeamCreated(true);

      // Navigate immediately
      setView("student-quiz", session.id);

    } catch (err) {
      console.error("Error creating team and joining:", err);
      setError(t('errors.failedToCreateTeam') + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl text-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft size={20} />
            {t('student.backToDashboard')}
          </button>

          <div className="text-4xl mb-3">⏳</div>
          <h1 className="text-3xl font-bold mb-2">{t('student.awaitingApproval')}</h1>
          <p className="text-gray-600">
            {t('student.teamToolsUnlockMessage')}
          </p>
        </div>
      </div>
    );
  }

  // STEP 1: PIN ENTRY
  if (!session) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            {t('student.backToDashboard')}
          </button>

          <h1 className="text-3xl font-bold mb-2">{t('student.createTeam')}</h1>
          <p className="text-gray-600 mb-6">Enter the Quiz PIN to create a team for that session.</p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder={t('session.enterPin')}
            value={quizPin}
            onChange={(e) => setQuizPin(e.target.value)}
            className="w-full p-4 border-2 rounded-lg text-center text-2xl mb-4"
            maxLength="6"
          />

          <button
            onClick={verifyPin}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : t('common.next')}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: TEAM CREATION FORM
  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <button
          onClick={() => setSession(null)} // Go back to PIN
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👥</div>
          <h1 className="text-3xl font-bold mb-2">{t('student.createTeam')}</h1>
          <p className="text-gray-600">{t('student.formTeamWithClassmates')}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Team Name */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('student.teamName')} *
          </label>
          <input
            type="text"
            placeholder={t('student.enterYourTeamName')}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Teammates Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {t('student.selectTeammates')} * ({t('student.chooseAtLeastOne')})
          </label>

          {loadingClassmates ? (
            <div className="text-center py-8 text-gray-500">
              {t('student.loadingClassmates')}
            </div>
          ) : classmates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('student.noOtherStudentsInClass')}
            </div>
          ) : (
            <div className="border-2 rounded-lg max-h-64 overflow-y-auto">
              {classmates.map((student) => (
                <div
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between ${selectedStudents.includes(student.id) ? "bg-blue-50" : ""
                    }`}
                >
                  <div>
                    <div className="font-semibold">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </div>
                  {selectedStudents.includes(student.id) && (
                    <Check size={20} className="text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Count */}
        {selectedStudents.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            <Users size={16} className="inline mr-1" />
            {selectedStudents.length + 1} {t('student.members')} ({t('student.includingYou')})
          </div>
        )}

        <button
          onClick={createTeam}
          disabled={loading || loadingClassmates}
          className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('student.joining') : t('student.createTeam') + " & Join"}
        </button>
      </div>
    </div>
  );
}
