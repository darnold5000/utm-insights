import { AppShell } from "@/components/app-shell";
import { LiveAppShell } from "@/components/live-app-shell";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { isAnalyticsBackendConfigured } from "@/lib/analytics/config";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (isAnalyticsBackendConfigured()) {
    return (
      <AnalyticsProvider>
        <LiveAppShell>{children}</LiveAppShell>
      </AnalyticsProvider>
    );
  }
  return <AppShell>{children}</AppShell>;
}
