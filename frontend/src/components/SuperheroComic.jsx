import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

const GAGS = [
  'Me: one tiny move. The arm: “I have considered every joint.”',
  'Obstacle says “no shortcuts.” CERBERUS says “great, I brought a planner.”',
  'When the cube lands in Bay A on the first try: tiny cape, enormous Q-values.',
  'The gripper: absolutely not dropping the plot this time.',
];

export default function SuperheroComic() {
  const [gagIndex, setGagIndex] = useState(0);

  const shuffleGag = () => {
    setGagIndex((current) => (current + 1 + Math.floor(Math.random() * (GAGS.length - 1))) % GAGS.length);
  };

  return (
    <section className="sect hero-comic-section" aria-labelledby="comic-title">
      <div className="hero-comic-heading">
        <div>
          <span className="comic-kicker"><Sparkles size={13} /> CERBERUS COMIC CLUB · ISSUE 001</span>
          <h2 id="comic-title">A tiny cape. A very serious pick-and-place.</h2>
          <p>Four panels, three intelligence heads, one spindle that absolutely does not get walked through.</p>
        </div>
        <a className="comic-link" href="#/console">Try a mission <ArrowRight size={15} /></a>
      </div>

      <figure className="comic-board">
        <img
          src="/images/cerberus-superhero-comic.webp"
          alt="Four-panel comic: a cleanroom operator issues a command, CERBERUS scans a cube, lens, prism, and sensor star, routes around an amber spindle, and places a crimson package in Bay A."
          loading="lazy"
          decoding="async"
        />
        <span className="comic-overlay comic-caption-one">MISSION 001 · SORT THE RED IC</span>
        <span className="comic-overlay comic-bubble-one">“Target locked. Cape secured.”</span>
        <span className="comic-overlay comic-caption-two">HEAD 1 · SCAN COMPLETE</span>
        <span className="comic-overlay comic-bubble-two">“Four shapes. One clear goal.”</span>
        <span className="comic-overlay comic-caption-three">PLOT TWIST · LASER SPINDLE</span>
        <span className="comic-overlay comic-bubble-three">“We go around.”</span>
        <span className="comic-overlay comic-caption-four">BAY A · PLACEMENT COMPLETE</span>
        <span className="comic-overlay comic-bubble-four">“Teamwork makes the cleanroom work.”</span>
      </figure>

      <ol className="comic-story" aria-label="Comic story panels">
        <li><b>01 · Mission drop</b><span>Move the crimson IC package to Bay A.</span></li>
        <li><b>02 · Vision lock</b><span>The scene contains a cube, lens, prism, and sensor star.</span></li>
        <li><b>03 · Safety beat</b><span>Route around the laser spindle; every joint move is checked.</span></li>
        <li><b>04 · Clean finish</b><span>Release inside the marked destination and log the outcome.</span></li>
      </ol>

      <div className="comic-meme-card" aria-live="polite">
        <span className="comic-sticker">MISSION MEME</span>
        <p>{GAGS[gagIndex]}</p>
        <button type="button" onClick={shuffleGag}>Shuffle the gag <Sparkles size={14} /></button>
      </div>
    </section>
  );
}
