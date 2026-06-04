"use client";

import { OnboardingChecklist } from "@/components/OnboardingChecklist";

interface Props {
  hasPhoto: boolean;
  hasBio: boolean;
  hasPublicProfile: boolean;
}

export function StaffOnboardingChecklist({ hasPhoto, hasBio, hasPublicProfile }: Props) {
  return (
    <OnboardingChecklist
      storageKey="vibepass_staff_onboarding_dismissed"
      title="Set up your instructor profile"
      description="Help customers find and connect with you."
      steps={[
        { label: "Invite accepted — welcome!", done: true },
        {
          label: "Upload a profile photo",
          done: hasPhoto,
          href: "/staff/profile",
        },
        {
          label: "Add your bio and specialties",
          done: hasBio,
          href: "/staff/profile",
        },
        {
          label: "Enable your public profile so customers can find you",
          done: hasPublicProfile,
          href: "/staff/profile",
        },
      ]}
    />
  );
}
