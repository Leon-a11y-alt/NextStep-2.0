"use client";

/*
|--------------------------------------------------------------------------
| SpeedPlay Page
|--------------------------------------------------------------------------
| This page displays the SpeedPlay landing screen.
| When the user clicks the "PLAY NOW" button, the SpeedPlay game modal opens.
| The actual game logic (AI quiz generation, upload, timer, scoring)
| is handled inside the SpeedPlay component.
|--------------------------------------------------------------------------
*/

import React, { useState } from "react";

// Main application layout (header, sidebar, etc.)
import AppShell from "@/components/AppShell";

// SpeedPlay game component (appears after clicking PLAY NOW)
import SpeedPlay from "@/components/gamification/playground/SpeedPlay";

// Play icon displayed inside the button
import { PlayIcon } from "@/lib/icons";

/*
|--------------------------------------------------------------------------
| SpeedPlayPage Component
|--------------------------------------------------------------------------
| This is the main page shown when users open SpeedPlay.
|--------------------------------------------------------------------------
*/
export default function SpeedPlayPage() {

  /*
  --------------------------------------------------------------------------
  | quizOpen State
  --------------------------------------------------------------------------
  | Stores whether the SpeedPlay game is currently open.
  |
  | false = Only show the landing page.
  | true  = Display the SpeedPlay game component.
  --------------------------------------------------------------------------
  */
  const [quizOpen, setQuizOpen] = useState(false);

  /*
  --------------------------------------------------------------------------
  | Render User Interface
  --------------------------------------------------------------------------
  */
  return (

    /*
    ------------------------------------------------------------------------
    | AppShell
    ------------------------------------------------------------------------
    | Provides the overall application layout such as:
    | - Header
    | - Navigation
    | - Page title
    | - Subtitle
    ------------------------------------------------------------------------
    */
    <AppShell
      title="SpeedPlay"
      subtitle="Upload your notes and let the AI quiz you."
    >

      {/* Main arcade-style landing page */}
      <div className="pg-stage-arcade">

        {/* Container holding all landing page content */}
        <div className="pg-arcade-content">

          {/* Small label shown above the title */}
          <span className="pg-arcade-eyebrow">
            Learning Arcade
          </span>

          {/* Main page title */}
          <h2 className="pg-arcade-title">
            SpeedPlay
          </h2>

          {/* Short explanation of how the game works */}
          <p className="pg-arcade-sub">
            Upload your notes — the AI writes the questions.
            Answer as many as you can in 20 seconds.
          </p>

          {/*
          ------------------------------------------------------------------
          | PLAY NOW Button
          ------------------------------------------------------------------
          | When clicked:
          | 1. setQuizOpen(true) updates the state.
          | 2. React re-renders the page.
          | 3. The SpeedPlay component becomes visible.
          ------------------------------------------------------------------
          */}
          <button
            className="pg-arcade-play"
            onClick={() => setQuizOpen(true)}
          >
            <PlayIcon size={20} />
            {" "}PLAY NOW
          </button>

          {/* Small instruction shown below the button */}
          <div className="pg-arcade-hint">
            Upload your .txt notes · AI writes the quiz · 20 seconds
          </div>

        </div>
      </div>

      {/*
      ----------------------------------------------------------------------
      | Conditional Rendering
      ----------------------------------------------------------------------
      | The SpeedPlay component is only displayed when quizOpen is true.
      |
      | quizOpen = false
      |    → Only the landing page is shown.
      |
      | quizOpen = true
      |    → SpeedPlay game opens.
      ----------------------------------------------------------------------
      */}
      {quizOpen && (

        <SpeedPlay

          /*
          --------------------------------------------------------------
          | onClose Function
          --------------------------------------------------------------
          | Passed to the SpeedPlay component.
          |
          | When the user closes the game,
          | setQuizOpen(false) hides the SpeedPlay component and returns
          | to the landing page.
          --------------------------------------------------------------
          */
          onClose={() => setQuizOpen(false)}
        />

      )}

    </AppShell>
  );
}
