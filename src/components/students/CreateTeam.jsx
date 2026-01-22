import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Users, Check, Copy, Monitor, Smartphone, UserPlus, Link } from "lucide-react";
import { generateTeamCode } from "../../utils/teamCode";
import JoinTeam from "./JoinTeam";

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

  // New states for device mode and team code
  const [isSharedDevice, setIsSharedDevice] = useState(false);
  const [showTeamCode, setShowTeamCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);

  // Team mode options state
  const [showTeamOptions, setShowTeamOptions] = useState(false);
  const [showJoinTeam, setShowJoinTeam] = useState(false);




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
        setError(t('errors.notTeamMode'));
        setLoading(false);
        return;
      }

      setSession(foundSession);
      setShowTeamOptions(true); // Show Create/Join options after PIN verification
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

      // Generate team code for separate devices mode
      const teamCode = generateTeamCode();

      // Create team
      const teamInsert = {
        name: teamName,
        teacher_id: teacherId,
        creator_id: appState.currentUser.id,
        team_code: teamCode,
        is_shared_device: isSharedDevice
      };

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

      if (membersError) throw membersError;

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

      // For separate devices mode, show team code screen
      // For shared device mode, navigate directly to quiz
      if (!isSharedDevice) {
        setGeneratedCode(team.team_code);
        setShowTeamCode(true);
      } else {
        setView("student-quiz", session.id);
      }

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

  // Copy team code to clipboard
  const copyTeamCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Handle "Join Team by Code" flow
  if (showJoinTeam && session) {
    return (
      <JoinTeam
        appState={appState}
        setView={setView}
        session={session}
        onBack={() => {
          setShowJoinTeam(false);
          setShowTeamOptions(true);
        }}
      />
    );
  }

  // TEAM MODE OPTIONS SCREEN (Create vs Join)
  if (showTeamOptions && session) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <button
            onClick={() => {
              setShowTeamOptions(false);
              setSession(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="text-5xl mb-4">👥</div>
          <h1 className="text-2xl font-bold mb-2">{t('student.teamModeQuiz')}</h1>
          <p className="text-gray-600 mb-6">{t('student.teamModeDescription')}</p>

          <div className="space-y-4">
            {/* Create Team Option */}
            <button
              onClick={() => {
                setShowTeamOptions(false);
                // Continue to team creation form
              }}
              className="w-full bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              <UserPlus size={24} />
              <div className="text-left">
                <div className="font-bold text-lg">{t('student.createNewTeam')}</div>
                <div className="text-sm opacity-90">{t('student.createNewTeamDesc')}</div>
              </div>
            </button>

            {/* Join Team Option */}
            <button
              onClick={() => {
                setShowTeamOptions(false);
                setShowJoinTeam(true);
              }}
              className="w-full bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3"
            >
              <Link size={24} />
              <div className="text-left">
                <div className="font-bold text-lg">{t('student.joinExistingTeam')}</div>
                <div className="text-sm opacity-90">{t('student.joinExistingTeamDesc')}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TEAM CODE DISPLAY SCREEN (for Separate Devices mode)
  if (showTeamCode) {
    return (
      <div className="bg-gradient-to-br from-blue-500 to-cyan-500 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">{t('student.teamCreated')}</h1>
          <p className="text-gray-600 mb-6">{t('student.shareCodeWithTeammates')}</p>

          {/* Team Code Display */}
          <div className="bg-gray-100 rounded-xl p-6 mb-6">
            <p className="text-gray-500 text-sm mb-2">{t('student.yourTeamCode')}</p>
            <div className="text-5xl font-bold tracking-widest text-blue-700 mb-4">
              {generatedCode}
            </div>
            <button
              onClick={copyTeamCode}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <Copy size={18} />
              {codeCopied ? t('common.copied') : t('common.copyCode')}
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            {t('student.teammatesEnterCode')}
          </p>

          <button
            onClick={() => setView("student-quiz", session.id)}
            className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold"
          >
            {t('student.continueToQuiz')}
          </button>
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

          <h1 className="text-3xl font-bold mb-2">{t('student.teamQuiz')}</h1>
          <p className="text-gray-600 mb-6">{t('student.enterPinForTeamQuiz')}</p>

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
            {loading ? t('common.verifying') : t('common.next')}
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

        {/* Device Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('student.howWillTeamPlay')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsSharedDevice(false)}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                !isSharedDevice
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Smartphone size={24} className={!isSharedDevice ? 'text-blue-600' : 'text-gray-400'} />
                <Smartphone size={24} className={!isSharedDevice ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <div className="font-bold text-sm">{t('student.separateDevices')}</div>
              <div className="text-xs text-gray-500">{t('student.separateDevicesDesc')}</div>
            </button>
            <button
              type="button"
              onClick={() => setIsSharedDevice(true)}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                isSharedDevice
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={24} className={isSharedDevice ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <div className="font-bold text-sm">{t('student.sharedDevice')}</div>
              <div className="text-xs text-gray-500">{t('student.sharedDeviceDesc')}</div>
            </button>
          </div>
        </div>

        <button
          onClick={createTeam}
          disabled={loading || loadingClassmates}
          className="w-full bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('student.joining') : t('student.createTeamAndJoin')}
        </button>
      </div>
    </div>
  );
}
