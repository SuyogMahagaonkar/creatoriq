import React, { useContext, useEffect, useState } from "react";
import * as ReactJoyride from "react-joyride";
const Joyride = ReactJoyride.default || ReactJoyride.Joyride || ReactJoyride;
const STATUS = ReactJoyride.STATUS || { FINISHED: 'finished', SKIPPED: 'skipped' };
import { CreatorContext } from "../context/CreatorContext";

export default function Walkthrough() {
  const { hasSeenWalkthrough, setHasSeenWalkthrough, isDarkMode } = useContext(CreatorContext);
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Only run if they haven't seen it
    if (!hasSeenWalkthrough && !run) {
      // Mark in localStorage immediately so a page refresh doesn't trigger it again
      localStorage.setItem("creator_iq_walkthrough", "true");
      
      // Slight delay to ensure DOM is fully rendered
      const timer = setTimeout(() => setRun(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenWalkthrough, run]);

  const steps = [
    {
      target: ".tour-sidebar",
      content: "Welcome to CreatorIQ! This is your main navigation rail where you can access all the platform features.",
      disableBeacon: true,
      placement: "right",
    },
    {
      target: ".sidebar-nav button:nth-of-type(2)",
      content: "Upload Studio: Drag and drop new videos here to efficiently start your publishing workflow.",
      placement: "right",
    },
    {
      target: ".sidebar-nav button:nth-of-type(6)",
      content: "Bulk SEO: Harness the built-in Google AI Engine to bulk-generate high-performing titles, descriptions, and tags for your videos.",
      placement: "right",
    },
    {
      target: ".sidebar-nav button:nth-of-type(7)",
      content: "Audience: Manage your community efficiently by tracking comments and analyzing audience sentiment in one place.",
      placement: "right",
    },
    {
      target: ".tour-topbar-sync",
      content: "This indicator confirms your YouTube API sync status. Green means your channel data is live and secure.",
      placement: "bottom",
    },
    {
      target: ".tour-settings-btn",
      content: "IMPORTANT: Open Settings here to configure your Google AI Engine API keys. You can get a free key easily from aistudio.google.com to unlock AI generation features!",
      placement: "right",
    },
    {
      target: ".tour-main-content",
      content: "This is your main canvas. It will adapt to show your dashboard metrics, video editor, and insights. Let's get started!",
      placement: "center",
    }
  ];

  const handleJoyrideCallback = (data) => {
    const { status, action } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    // If they finish, skip, or close it explicitly
    if (finishedStatuses.includes(status) || action === 'close') {
      setRun(false);
      setHasSeenWalkthrough(true);
      localStorage.setItem("creator_iq_walkthrough", "true");
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      locale={{ skip: "Skip Tour" }}
      steps={steps}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'var(--chart-primary)',
          backgroundColor: isDarkMode ? '#1a1c28' : '#ffffff',
          textColor: isDarkMode ? '#e4e5eb' : '#1a1d26',
          arrowColor: isDarkMode ? '#1a1c28' : '#ffffff',
          overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        },
        buttonClose: {
          display: 'none',
        },
        buttonSkip: {
          color: 'var(--text-muted)',
          fontSize: '14px',
        }
      }}
    />
  );
}
