// =============================================
// PAGE ONBOARDING
// =============================================

import { useNavigate } from "react-router-dom";
import { Onboarding } from "@/components/onboarding/Onboarding";

export default function OnboardingPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate("/", { replace: true });
  };

  return <Onboarding onComplete={handleComplete} />;
}
