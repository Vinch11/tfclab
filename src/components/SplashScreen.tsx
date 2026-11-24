import defaultLogo from "@/assets/logo-2fc.png";
import { getCachedLogoUrl } from "@/lib/appLogoCache";

export function LoadingStatus({ label }: { label: string }) {
  return (
    <div className="loading-status" role="status">
      <span>{label}</span>
      <span className="loading-rail" aria-hidden="true" />
    </div>
  );
}

// index.html presents the same layout before React's first commit.
export function SplashScreen({ label }: { label: string }) {
  const cachedLogo = getCachedLogoUrl();

  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="loading-cover">
          <img
            className="loading-logo"
            data-custom={cachedLogo ? "true" : undefined}
            src={cachedLogo || defaultLogo}
            alt={cachedLogo ? "Logo du coach" : "Logo TFCLab"}
            onError={({ currentTarget }) => {
              if (!currentTarget.dataset.custom) return;
              delete currentTarget.dataset.custom;
              currentTarget.alt = "Logo TFCLab";
              currentTarget.src = defaultLogo;
            }}
          />
          <div className="loading-brand">Two For<br />Coaching Lab</div>
        </div>
        <LoadingStatus label={label} />
      </div>
    </div>
  );
}
