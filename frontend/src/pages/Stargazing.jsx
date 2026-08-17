import React from "react";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import SatelliteAltIcon from "@mui/icons-material/SatelliteAlt";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Header from "../components/Header";
import Footer from "../components/Footer";
import StarField from "../components/StarField";
import IssTracker from "../components/IssTracker";
import SpaceWeatherBoard from "../components/SpaceWeatherBoard";
import AsteroidWatch from "../components/AsteroidWatch";
import ErrorBoundary from "../components/ErrorBoundary";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const FEATURES = [
  {
    icon: <SmartToyOutlinedIcon fontSize="small" />,
    title: "AI-powered cosmic Q&A",
    body: "Ask about space, stars, black holes or celestial events and get an answer in real time.",
  },
  {
    icon: <PhotoCameraOutlinedIcon fontSize="small" />,
    title: "Smart image uploads",
    body: "Upload a photograph of the night sky and find out what you captured.",
  },
  {
    icon: <SchoolOutlinedIcon fontSize="small" />,
    title: "Beginner friendly",
    body: "No background in astronomy needed. Just bring your curiosity.",
  },
];

const RESOURCES = [
  { name: "NASA Night Sky Network", href: "https://nightsky.jpl.nasa.gov/", icon: <RocketLaunchIcon fontSize="small" /> },
  { name: "ISRO Space Research", href: "https://www.isro.gov.in/", icon: <SatelliteAltIcon fontSize="small" /> },
  { name: "Heavens-Above Tracker", href: "https://heavens-above.com/", icon: <TravelExploreIcon fontSize="small" /> },
  { name: "TimeAndDate Astronomy", href: "https://www.timeanddate.com/astronomy/", icon: <EventOutlinedIcon fontSize="small" /> },
];

const Stargazing = () => {
  useDocumentTitle("Stargazing guide");

  return (
  <div className="relative min-h-screen overflow-hidden">
    <StarField count={60} />

    <div className="relative flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-12">
        <section className="nm-surface space-y-6 p-8 animate-fade-in">
          <h1 className="text-2xl font-semibold text-slate-100">
            Stargazing guide
          </h1>

          <p className="leading-relaxed text-slate-400">
            Your gateway to the cosmos. This is not just another stargazing tool,
            it is an AI-powered guide built to make the night sky more
            accessible, interactive and insightful.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="nm-card space-y-3 p-5">
                <span className="nm-flat-space-base-sm grid h-10 w-10 place-items-center rounded-full text-accent">
                  {feature.icon}
                </span>
                <h2 className="text-sm font-medium text-slate-200">
                  {feature.title}
                </h2>
                <p className="text-xs leading-relaxed text-slate-500">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>

          <div className="nm-well space-y-4 p-6">
            <p className="text-sm text-slate-400">
              We reference and encourage exploration through trusted public
              science platforms:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {RESOURCES.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="nm-card flex items-center gap-3 px-4 py-3 text-sm text-slate-400 transition-all duration-200 hover:text-accent active:nm-inset-space-base-sm"
                >
                  <span className="text-accent">{item.icon}</span>
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="nm-well flex items-start gap-4 p-6">
            <span className="mt-0.5 shrink-0 text-accent">
              <LightbulbOutlinedIcon fontSize="small" />
            </span>
            <p className="text-sm leading-relaxed text-slate-400">
              <span className="font-medium text-slate-200">Pro tip:</span> find a
              dark place away from city lights, give your eyes 20 to 30 minutes
              to adjust, and let the night sky speak.
            </p>
          </div>
        </section>

        <ErrorBoundary label="Space weather">
          <SpaceWeatherBoard />
        </ErrorBoundary>

        <ErrorBoundary label="Near-Earth objects">
          <AsteroidWatch />
        </ErrorBoundary>

        <ErrorBoundary label="The ISS tracker">
          <IssTracker />
        </ErrorBoundary>

        <section className="nm-surface space-y-4 p-8">
          <div className="flex items-center gap-3">
            <span className="text-accent">
              <MapOutlinedIcon />
            </span>
            <h2 className="text-lg font-semibold text-slate-100">
              Interactive star map
            </h2>
          </div>
          <div className="nm-well overflow-hidden p-2">
            <iframe
              src="https://stellarium-web.org/"
              title="Stellarium sky map"
              className="h-[500px] w-full rounded-xl"
            />
          </div>
        </section>

        <section className="nm-surface flex flex-col items-center gap-5 p-8 text-center">
          <p className="text-slate-400">
            Want to catch the next meteor shower or lunar eclipse?
          </p>
          <a
            href="https://www.timeanddate.com/astronomy/sights-to-see.html"
            target="_blank"
            rel="noreferrer"
            className="nm-button-accent flex items-center gap-2"
          >
            <span>View upcoming celestial events</span>
            <ArrowForwardIcon fontSize="small" />
          </a>
        </section>
      </main>

      <Footer />
    </div>
  </div>
  );
};

export default Stargazing;
