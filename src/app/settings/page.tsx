import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Customize your store tracker."
      />
      <SettingsForm settings={settings} />
    </div>
  );
}
