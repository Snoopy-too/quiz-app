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
  const [schemaChecked, setSchemaChecked] = useState(false);
  const [hasCreatorColumn, setHasCreatorColumn] = useState(true);

  const columnExists = async (table, column) => {
    if (schemaChecked) return hasCreatorColumn;

    try {
      const { data, error } = await supabase
        .from(`${table}`)
        .select(`${column}`)
        .limit(1);

      if (error && error.code === '42703') {
        setHasCreatorColumn(false);
        setSchemaChecked(true);
        return false;
      }

      setHasCreatorColumn(true);
      setSchemaChecked(true);
      return true;
    } catch (err) {
      console.error(`Failed to probe ${table}.${column}:`, err);
      return true;
    }
  };

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

      if (await columnExists("teams", "creator_id")) {
        teamInsert.creator_id = appState.currentUser.id;
      }

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

      const { error: membersError } = await supabase
        .from("team_members")
        .insert(teamMembers);

      if (membersError) {
        if (membersError.code === '42703' && membersError.message?.includes('student_id')) {
          throw new Error(t('errors.databaseMigrationIncomplete'));
        }
        throw membersError;
      }

      setCreatedTeam(team);
      setTeamCreated(true);
    } catch (err) {
      console.error("Error creating team:", err);
      setError(t('errors.failedToCreateTeam') + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinTeamQuiz = async () => {
    if (!quizPin || quizPin.length !== 6) {
      setError(t('student.enterValid6DigitPIN'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find session by PIN
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

      const session = sessions[0];

      if (session.status === "completed") {
        setError(t('errors.quizAlreadyEnded'));
        setLoading(false);
        return;
      }

      // Create team entry in session_participants
      const { data: participant, error: participantError } = await supabase
        .from("session_participants")
        .insert({
          session_id: session.id,
          user_id: appState.currentUser.id,
          team_id: createdTeam.id,
          is_team_entry: true,
          score: 0
        })
        .select()
        .single();

      if (participantError) {
        if (participantError.code === '23505') {
          console.log('Team already joined this session, proceeding...');
        } else if (participantError.message?.includes('is_team_entry')) {
          console.warn('Missing is_team_entry column on session_participants table, retrying without flag');
          const { error: fallbackError } = await supabase
            .from("session_participants")
            .insert({
              session_id: session.id,
              user_id: appState.currentUser.id,
              team_id: createdTeam.id,
              score: 0
            });

          if (fallbackError && fallbackError.code !== '23505') {
            console.error('Fallback team insert failed:', fallbackError);
            throw new Error(t('errors.databaseMigrationIncomplete'));
          }
        } else {
          throw new Error(`${t('errors.failedToJoinQuiz')}: ${participantError.message}`);
        }
      }

      // Navigate to quiz
      setView("student-quiz", session.id);
    } catch (err) {
      setError(t('errors.errorJoiningQuiz') + ": " + err.message);
      setLoading(false);
    }
  };

  if (!teamCreated) {
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
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            {t('student.backToDashboard')}
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
            {loading ? t('student.creatingTeam') : t('student.createTeam')}
          </button>
        </div>
      </div>
    );
  }

  // Team created - show join quiz option
  return (
    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          {t('student.backToDashboard')}
        </button>

        <div className="text-center mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-2 text-green-600">{t('student.teamCreated')}</h1>
          <p className="text-xl font-semibold text-gray-800 mb-2">{createdTeam?.name}</p>
          <p className="text-gray-600">
            {selectedStudents.length + 1} {t('student.members')}
          </p>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-bold text-center mb-4">{t('student.joinTeamQuiz')}</h2>
          <p className="text-center text-gray-600 mb-4">{t('student.enterPinFromTeacher')}</p>

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
            onClick={joinTeamQuiz}
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('student.joining') : t('student.joinAsTeam')}
          </button>
        </div>
      </div>
    </div>
  );
}
