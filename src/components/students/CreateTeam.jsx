import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../supabaseClient";
import { ArrowLeft, Users, Check, Copy, Monitor, Smartphone, UserPlus, Link, AlertTriangle } from "lucide-react";
import { generateTeamCode } from "../../utils/teamCode";
import { leaveTeamAndSession } from "../../utils/teamCleanup";
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

  // States for live team members preview and cancellation on code screen
  const [teamMembers, setTeamMembers] = useState([]);
  const [cancellingTeam, setCancellingTeam] = useState(false);

  // Check if returning from StudentQuiz waiting room via "Leave / Switch Team"
  useEffect(() => {
    const switchSessionId = sessionStorage.getItem('quizapp_switch_team_session_id');
    if (switchSessionId) {
      sessionStorage.removeItem('quizapp_switch_team_session_id');
      loadSessionForTeamSwitch(switchSessionId);
    }
  }, []);

  const loadSessionForTeamSwitch = async (sessionId) => {
    setLoading(true);
    setError(null);
    try {
      const { data: foundSession, error: sErr } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sErr) throw sErr;
      if (foundSession && foundSession.status !== 'completed' && foundSession.mode === 'team') {
        setSession(foundSession);
        setQuizPin(foundSession.pin || "");
        setShowTeamOptions(true);
      }
    } catch (err) {
      console.error("[CreateTeam] Error loading session for team switch:", err);
    } finally {
      setLoading(false);
    }
  };

  // Poll live team members while on the team code display screen
  useEffect(() => {
    if (!showTeamCode || !createdTeam?.id) return;

    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const { data, error: membersErr } = await supabase
          .from("team_members")
          .select("id, student_id, users(name)")
          .eq("team_id", createdTeam.id);

        if (!membersErr && data && isMounted) {
          setTeamMembers(data.map((m) => m.users?.name || t('common.student')));
        }
      } catch (err) {
        console.error("[CreateTeam] Error fetching team members:", err);
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [showTeamCode, createdTeam?.id, t]);

  const handleCancelCreatedTeam = async () => {
    if (!session || !createdTeam) return;
    setCancellingTeam(true);
    setError(null);
    try {
      await leaveTeamAndSession({
        sessionId: session.id,
        userId: appState.currentUser.id,
        teamId: createdTeam.id,
      });

      // Reset team creation state
      setShowTeamCode(false);
      setCreatedTeam(null);
      setTeamCreated(false);
      setGeneratedCode("");
      setTeamMembers([]);
      // Open Join Team screen immediately so they can enter partner's code
      setShowJoinTeam(true);
    } catch (err) {
      console.error("[CreateTeam] Error cancelling team:", err);
      setError(err.message || t('errors.somethingWentWrong'));
    } finally {
      setCancellingTeam(false);
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

      // Check if student is already a participant in this session (e.g. created a team then backed out)
      const { data: existingParticipant } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", foundSession.id)
        .eq("user_id", appState.currentUser.id)
        .maybeSingle();

      if (existingParticipant) {
        // Already in session — rejoin directly
        setView("student-quiz", foundSession.id);
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

    if (isSharedDevice && selectedStudents.length === 0) {
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
            {/* Create Team Option (Leader) */}
            <button
              onClick={() => {
                setShowTeamOptions(false);
                // Continue to team creation form
              }}
              className="w-full bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-all flex flex-col items-start gap-1 text-left border-2 border-blue-500 hover:border-blue-700 shadow-md group"
            >
              <div className="flex items-center gap-2 font-bold text-lg">
                <UserPlus size={22} className="text-white group-hover:scale-110 transition-transform" />
                <span>{t('student.iamTeamLeader', 'I am the Team Leader')}</span>
              </div>
              <div className="text-sm text-blue-100 font-medium">
                {t('student.createTeamAndGetCode', 'Create Team & Get Code')}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-400 text-amber-950 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide shadow-sm">
                <span>⚠️</span>
                <span>{t('student.oneLeaderWarning', 'Only ONE person per group should click this!')}</span>
              </div>
            </button>

            {/* Join Team Option (Partner) */}
            <button
              onClick={() => {
                setShowTeamOptions(false);
                setShowJoinTeam(true);
              }}
              className="w-full bg-emerald-600 text-white p-4 rounded-xl hover:bg-emerald-700 transition-all flex flex-col items-start gap-1 text-left border-2 border-emerald-500 hover:border-emerald-700 shadow-md group"
            >
              <div className="flex items-center gap-2 font-bold text-lg">
                <Link size={22} className="text-white group-hover:scale-110 transition-transform" />
                <span>{t('student.ihaveTeamCode', 'I have a Team Code from my partner')}</span>
              </div>
              <div className="text-sm text-emerald-100">
                {t('student.joinTeamWithCode', 'Join Team')} — {t('student.enterCodeFromLeader', 'Enter the 4-character code from your team leader')}
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
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold mb-1">{t('student.teamCreated')}</h1>
          {createdTeam?.name && (
            <div className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mb-3">
              {createdTeam.name}
            </div>
          )}
          <p className="text-gray-600 mb-5 text-sm">{t('student.shareCodeWithTeammates')}</p>

          {/* Team Code Display */}
          <div className="bg-gray-100 rounded-xl p-5 mb-5 border border-gray-200">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
              {t('student.yourTeamCode')}
            </p>
            <div className="text-5xl font-extrabold tracking-widest text-blue-700 mb-3 font-mono">
              {generatedCode}
            </div>
            <button
              onClick={copyTeamCode}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
            >
              <Copy size={16} />
              {codeCopied ? t('common.copied') : t('common.copyCode')}
            </button>
          </div>

          {/* Live Members Roster */}
          <div className="bg-blue-50 rounded-xl p-4 mb-5 border border-blue-200 text-left">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-2">
              <span className="flex items-center gap-1.5">
                <Users size={16} />
                {t('student.teammates', 'Teammates')} ({teamMembers.length})
              </span>
              <span className="text-blue-600 font-normal">
                {teamMembers.length > 1
                  ? t('student.teammatesJoined', { count: teamMembers.length })
                  : t('student.waitingForTeammates', 'Waiting for partner...')}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {teamMembers.map((name, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white border border-blue-200 text-blue-800 text-xs px-2.5 py-1 rounded-md font-medium"
                >
                  <Check size={12} className="text-green-600" />
                  {name}
                </span>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg mb-4 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <button
              onClick={() => setView("student-quiz", session.id)}
              className="w-full bg-blue-600 text-white p-3.5 rounded-xl hover:bg-blue-700 text-lg font-semibold shadow-md transition-colors"
            >
              {t('student.continueToQuiz')}
            </button>

            {/* Cancel & Join Partner's Team Escape Hatch */}
            <button
              onClick={handleCancelCreatedTeam}
              disabled={cancellingTeam}
              className="w-full bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 border border-gray-300 hover:border-red-300 p-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={16} />
              {cancellingTeam ? t('student.cancellingTeam', 'Cancelling team...') : t('student.cancelAndJoinPartner', "Cancel & Join Partner's Team Instead")}
            </button>
          </div>
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

        {/* Device Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t('student.howWillTeamPlay')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setIsSharedDevice(false); setSelectedStudents([]); }}
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
              onClick={() => session?.allow_shared_device && setIsSharedDevice(true)}
              disabled={!session?.allow_shared_device}
              className={`p-4 border-2 rounded-xl text-left transition-all ${
                !session?.allow_shared_device
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : isSharedDevice
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={24} className={isSharedDevice && session?.allow_shared_device ? 'text-blue-600' : 'text-gray-400'} />
              </div>
              <div className="font-bold text-sm">{t('student.sharedDevice')}</div>
              <div className="text-xs text-gray-500">{t('student.sharedDeviceDesc')}</div>
              {!session?.allow_shared_device && (
                <div className="text-xs text-red-400 mt-1">{t('student.sharedDeviceDisabled', 'Not enabled by teacher')}</div>
              )}
            </button>
          </div>
        </div>

        {/* Teammates Selection — only for shared device mode */}
        {isSharedDevice && (
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

            {selectedStudents.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                <Users size={16} className="inline mr-1" />
                {selectedStudents.length + 1} {t('student.members')} ({t('student.includingYou')})
              </div>
            )}
          </div>
        )}

        {/* Hint for separate devices mode */}
        {!isSharedDevice && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <Users size={16} className="inline mr-1" />
            {t('student.teammatesWillJoinWithCode') || "After creating the team, share the team code with your teammates so they can join."}
          </div>
        )}

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
