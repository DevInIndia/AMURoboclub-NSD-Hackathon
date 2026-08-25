import React from "react";
import { Link } from "react-router-dom";
import StarField from "../components/StarField";
import { useDocumentTitle } from "../lib/useDocumentTitle";

/**
 * Privacy policy.
 *
 * Deliberately public: Google requires a reachable privacy policy URL before a
 * Google Cloud OAuth app can leave testing mode, and its reviewers -- like any
 * visitor -- arrive signed out. Keep this route outside ProtectedRoute.
 *
 * Everything below describes what the code actually does. If the data the app
 * stores changes, this page changes with it.
 */

const UPDATED = "26 August 2026";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
    <div className="space-y-3 text-sm leading-relaxed text-slate-400">{children}</div>
  </section>
);

const Privacy = () => {
  useDocumentTitle("Privacy");

  return (
    <div className="relative min-h-screen overflow-hidden px-6 py-16">
      <StarField count={40} />

      <div className="nm-surface relative mx-auto max-w-2xl space-y-8 p-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-100">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated {UPDATED}</p>
        </div>

        <Section title="What this is">
          <p>
            Celestial Chatbot is a student project that answers astronomy questions,
            classifies stars from physical measurements, and shows public space-weather
            data. It is not a commercial service. This page describes exactly what it
            stores and who it sends data to.
          </p>
        </Section>

        <Section title="What is stored">
          <p>When you are signed in, two things are saved to the database:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              The questions you ask and the answers returned, so your history page can
              show them back to you.
            </li>
            <li>
              The star measurements you submit to the classifier, along with the
              predicted classification.
            </li>
          </ul>
          <p>
            Each row is tagged with the account identifier issued by our authentication
            provider. <strong className="text-slate-300">Your name and email address
            are not stored in the database</strong> &mdash; only that identifier, which
            is what keeps your history separate from anyone else&rsquo;s.
          </p>
        </Section>

        <Section title="Images you upload">
          <p>
            Photographs of the night sky are held in memory only for as long as it takes
            to describe them, then discarded.{" "}
            <strong className="text-slate-300">They are never written to disk or to the
            database</strong>, and neither is the description produced from them.
          </p>
        </Section>

        <Section title="Who else sees your data">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong className="text-slate-300">Auth0</strong> handles sign-in and holds
              your account details. Signing in with Google shares your basic profile with
              Auth0, not with us beyond the identifier above.
            </li>
            <li>
              <strong className="text-slate-300">Google Gemini</strong> receives the text
              of your questions and any image you upload, in order to generate a reply.
              This project uses Google&rsquo;s free API tier, and Google may use content
              sent through it to improve their products. Do not send anything private or
              sensitive.
            </li>
            <li>
              <strong className="text-slate-300">Neon, Render and Netlify</strong> host
              the database, the API and the website respectively.
            </li>
          </ul>
          <p>
            Space-weather and asteroid data come from NOAA and NASA. Those are public
            feeds and no information about you is sent to them.
          </p>
        </Section>

        <Section title="In your browser">
          <p>
            Your sign-in session is kept in your browser&rsquo;s local storage so you stay
            signed in between visits. There are no advertising or analytics trackers.
          </p>
          <p>
            Your IP address is used momentarily to enforce rate limits and is not written
            to any database.
          </p>
        </Section>

        <Section title="Removing your data">
          <p>
            Email the address below and your stored questions and classifications will be
            deleted. Deleting your account with the identity provider stops any further
            data being recorded.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy:{" "}
            <a
              href="mailto:shashankchauhan2518@gmail.com"
              className="text-accent transition-colors hover:text-accent-soft"
            >
              shashankchauhan2518@gmail.com
            </a>
          </p>
        </Section>

        <div className="nm-divider" />

        <Link to="/" className="nm-button-accent inline-block">
          Back to the observatory
        </Link>
      </div>
    </div>
  );
};

export default Privacy;
