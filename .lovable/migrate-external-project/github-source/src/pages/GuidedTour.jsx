import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { DEFAULT_BRANCH_NAMES, DEFAULT_PLATFORMS } from "@/lib/tourDefaults";
import TourDashboardPreview from "@/components/tour/TourDashboardPreview";
import TourWizard from "@/components/tour/TourWizard";
import ClubNameStep from "@/components/tour/steps/ClubNameStep";
import BranchesStep from "@/components/tour/steps/BranchesStep";
import PlatformsStep from "@/components/tour/steps/PlatformsStep";
import SeasonRolloverStep from "@/components/tour/steps/SeasonRolloverStep";
import CompletionStep from "@/components/tour/steps/CompletionStep";
import DemoAccountSetup from "@/components/tour/DemoAccountSetup";
import PublicNav from "@/components/layout/PublicNav";
import usePageMeta from "@/lib/usePageMeta";


const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function GuidedTour() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [hasClub, setHasClub] = useState(false);
  const [step, setStep] = useState(0);
  const [persisting, setPersisting] = useState(false);

  const [clubName, setClubName] = useState("");
  const [sport, setSport] = useState("Soccer");
  const [branchNames, setBranchNames] = useState(DEFAULT_BRANCH_NAMES);
  const [platforms, setPlatforms] = useState(DEFAULT_PLATFORMS);
  const [rolloverSummary, setRolloverSummary] = useState(null);
  const [liveData, setLiveData] = useState({});
  const [demoInfo, setDemoInfo] = useState(null);
  const [showAccountSetup, setShowAccountSetup] = useState(false);

  usePageMeta({
    title: "Product Tour | Club Rudder Soccer Club Software",
    description: "Take a guided tour of Club Rudder: registration, payments, scheduling and player development for multi-branch soccer clubs, set up with your own club.",
  });

  const isLive = isAuthed && hasClub;

  // Restore tour state from sessionStorage (survives auth redirect)
  useEffect(() => {
    const saved = sessionStorage.getItem("tourState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.clubName) setClubName(parsed.clubName);
        if (parsed.sport) setSport(parsed.sport);
        if (parsed.branchNames) setBranchNames(parsed.branchNames);
        if (parsed.platforms) setPlatforms(parsed.platforms);
        if (parsed.step != null) setStep(parsed.step);
      } catch {}
    }
  }, []);

  // Check access + auth on mount
  useEffect(() => {
    const token = searchParams.get("token") || sessionStorage.getItem("demoAccessToken");
    if (token) sessionStorage.setItem("demoAccessToken", token);

    (async () => {
      let hasAccess = false;
      let authed = false;

      try {
        authed = await base44.auth.isAuthenticated();
        setIsAuthed(authed);
      } catch {}

      // Admin always has access
      if (authed) {
        try {
          const user = await base44.auth.me();
          if (user?.role === "admin" || user?.is_super_admin) {
            hasAccess = true;
          }
          if (user?.data?.club_id) {
            setHasClub(true);
            if (!clubName && user.data.club_name) setClubName(user.data.club_name);
            fetchLiveData(user.data.club_id);
          }
        } catch {}
      }

      // Token-based access (from invite/approval email)
      if (!hasAccess && token) {
        try {
          const res = await base44.functions.invoke("validate-demo-access", { token });
          if (res.data?.valid) {
            hasAccess = true;
            setDemoInfo({
              name: res.data.name,
              email: res.data.email,
              club_name: res.data.club_name,
              sport: res.data.sport,
            });
            if (res.data.club_name && !clubName) setClubName(res.data.club_name);
            if (res.data.sport) setSport(res.data.sport);
          }
        } catch {}
      }

      // Approved request matching the user's email
      if (!hasAccess && authed) {
        try {
          const user = await base44.auth.me();
          if (user?.email) {
            const res = await base44.functions.invoke("validate-demo-access", { email: user.email });
            if (res.data?.valid) hasAccess = true;
          }
        } catch {}
      }

      if (!hasAccess) {
        setAccessDenied(true);
      } else if (!authed) {
        // Has a valid demo token but not logged in — create an account to start the trial
        setShowAccountSetup(true);
      }
      setLoading(false);
    })();
  }, []);

  // Persist tour state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("tourState", JSON.stringify({ clubName, sport, branchNames, platforms, step }));
  }, [clubName, sport, branchNames, platforms, step]);

  const fetchLiveData = async (clubId) => {
    try {
      const [branches, platformsData, teams, players] = await Promise.all([
        base44.entities.Location.filter({ club_id: clubId }).catch(() => []),
        base44.entities.Platform.filter({ club_id: clubId }).catch(() => []),
        base44.entities.Team.filter({ club_id: clubId }).catch(() => []),
        base44.entities.Player.filter({ club_id: clubId }).catch(() => []),
      ]);
      setLiveData({ branches, platforms: platformsData, teams, players });
    } catch {}
  };

  const handleNext = async () => {
    if (step === 0) {
      // Club name step — create club if authed but no club yet
      if (isAuthed && !hasClub && clubName.trim()) {
        setPersisting(true);
        try {
          await base44.functions.invoke("start-trial", {
            clubName: clubName.trim(),
            branchCount: "2-5",
            sport,
            inviteEmails: [],
          });
          // Refresh user to pick up new club_id
          await base44.auth.me();
          setHasClub(true);
          // Fetch the new club's data
          const user = await base44.auth.me();
          if (user?.data?.club_id) fetchLiveData(user.data.club_id);
        } catch (err) {
          console.error("start-trial error:", err);
        } finally {
          setPersisting(false);
        }
      }
      setStep(1);
    } else if (step === 1) {
      // Branches step — persist if live
      if (isLive) {
        setPersisting(true);
        try {
          await base44.functions.invoke("create-trial-branches", {
            branchNames: branchNames.filter((n) => n?.trim()),
          });
          const user = await base44.auth.me();
          if (user?.data?.club_id) fetchLiveData(user.data.club_id);
        } catch (err) {
          console.error("create-trial-branches error:", err);
        } finally {
          setPersisting(false);
        }
      }
      setStep(2);
    } else if (step === 2) {
      // Platforms step — persist if live
      if (isLive) {
        setPersisting(true);
        try {
          await base44.functions.invoke("select-trial-platforms", { platforms });
          const user = await base44.auth.me();
          if (user?.data?.club_id) fetchLiveData(user.data.club_id);
        } catch (err) {
          console.error("select-trial-platforms error:", err);
        } finally {
          setPersisting(false);
        }
      }
      setStep(3);
    }
    // Step 3 (rollover) advances itself via onComplete callback
  };

  const handleRolloverComplete = (summary) => {
    setRolloverSummary(summary);
    if (isLive) {
      base44.auth.me().then((u) => {
        if (u?.data?.club_id) fetchLiveData(u.data.club_id);
      });
    }
    setStep(4);
  };

  const handleEnterDashboard = () => {
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="min-h-screen wellness-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: p() }} />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="force-light min-h-screen wellness-bg flex items-center justify-center text-slate-800 px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: p(0.12) }}>
            <svg className="w-7 h-7" style={{ color: p() }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-2xl font-extrabold mb-3 text-slate-900">Demo access required</h1>
          <p className="text-slate-600 mb-8">The interactive demo is available by request. Submit a quick form and we'll grant you access.</p>
          <button onClick={() => navigate("/demo-access")} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg font-bold text-white transition-opacity hover:opacity-90 min-h-[44px]" style={{ background: p() }}>
            Request Demo Access
          </button>
        </div>
      </div>
    );
  }

  // Unauthenticated invitee — create a password-based account before the tour
  if (showAccountSetup) {
    return (
      <div className="force-light min-h-screen wellness-bg text-slate-800">
        <PublicNav />
        <div className="flex items-center justify-center px-6 py-10" style={{ minHeight: "calc(100dvh - 57px)" }}>
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <DemoAccountSetup email={demoInfo?.email} name={demoInfo?.name} />
          </div>
        </div>
      </div>
    );
  }

  const tourState = { clubName, sport, branchNames, platforms, rolloverSummary, step };
  const canAdvance = step === 0 ? clubName.trim().length > 0 : step === 1 ? branchNames.some((n) => n?.trim()) : step === 2 ? platforms.length > 0 : true;

  const renderStep = () => {
    switch (step) {
      case 0: return <ClubNameStep clubName={clubName} setClubName={setClubName} sport={sport} setSport={setSport} isLive={isLive} clubExists={hasClub} />;
      case 1: return <BranchesStep branchNames={branchNames} setBranchNames={setBranchNames} isLive={isLive} />;
      case 2: return <PlatformsStep platforms={platforms} setPlatforms={setPlatforms} isLive={isLive} />;
      case 3: return <SeasonRolloverStep tourState={tourState} onComplete={handleRolloverComplete} isLive={isLive} />;
      case 4: return <CompletionStep summary={rolloverSummary} onEnterDashboard={handleEnterDashboard} isLive={isLive} />;
      default: return null;
    }
  };

  return (
    <div className="force-light min-h-screen wellness-bg text-slate-800">
      <PublicNav />

      {/* Main: dashboard preview + wizard panel */}
      <div className="flex flex-col lg:flex-row" style={{ minHeight: "calc(100dvh - 57px)" }}>
        {/* Dashboard preview (left / top) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 pb-32 lg:pb-8">
          <div className="max-w-3xl mx-auto">
            <TourDashboardPreview tourState={tourState} liveData={liveData} />
          </div>
        </div>

        {/* Wizard panel (right on desktop, bottom sheet on mobile) */}
        <div className="lg:w-[440px] lg:shrink-0 fixed lg:static bottom-0 left-0 right-0 lg:h-auto bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shadow-2xl lg:shadow-none" style={{ height: "60vh", maxHeight: "640px" }}>
          <TourWizard
            step={step}
            totalSteps={5}
            isLive={isLive}
            persisting={persisting}
            canAdvance={canAdvance}
            onNext={handleNext}
            onBack={() => setStep(Math.max(0, step - 1))}
          >
            {renderStep()}
          </TourWizard>
        </div>
      </div>
    </div>
  );
}