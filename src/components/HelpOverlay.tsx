/**
 * HelpOverlay.tsx — Lane J (help / controls overlay)
 *
 * A pause-friendly, app-level modal that lists every keybinding and a concise
 * glossary of the core systems, so players can always look up what a key does
 * and how a mechanic works. Onboarding polish.
 *
 * Self-contained: it owns its own visibility state and a single global F1
 * keydown listener, so mounting it is the only change the rest of the app
 * needs (see src/App.tsx). It renders nothing until toggled open.
 *
 * Content lives in ./helpOverlayContent (a framework-free, unit-tested module).
 */
import { useEffect, useRef, useState } from 'react';
import { getKeybindGroups, getGlossary } from './helpOverlayContent';

export function HelpOverlay() {
  const [open, setOpen] = useState(false);

  // Mirror `open` into a ref so the once-registered listener can read current
  // state without re-binding on every toggle.
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Single global key listener. Registered in the CAPTURE phase so that while
  // the overlay is open it intercepts input *before* each scene's own bubbling
  // window keydown listener — keeping the underlying game "paused" from input
  // (no sim changes; the listeners simply never see the swallowed keys).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        // F1 toggles help in every mode; suppress the browser's built-in help.
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
        return;
      }
      if (openRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
        }
        // Swallow all other keys while open so nothing leaks to the game beneath.
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  // Move focus to the close button when opened (mirrors GameOverModal autoFocus).
  useEffect(() => {
    if (open) closeBtnRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const keybindGroups = getKeybindGroups();
  const glossary = getGlossary();

  return (
    <div
      className="help-overlay"
      id="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Help — controls and game glossary"
      onClick={() => setOpen(false)}
    >
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <header className="help-card__header">
          <div className="help-card__titles">
            <h2 className="help-card__title">Help &amp; Controls</h2>
            <p className="help-card__subtitle">Keybindings and a glossary of core systems</p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="help-card__close"
            onClick={() => setOpen(false)}
            aria-label="Close help"
          >
            ✕
          </button>
        </header>

        <div className="help-card__body">
          <section className="help-section" aria-label="Controls">
            <h3 className="help-section__heading">Controls</h3>
            <div className="help-keybinds">
              {keybindGroups.map((group) => (
                <div className="help-keygroup" key={group.context}>
                  <div className="help-keygroup__context">{group.context}</div>
                  {group.note && <div className="help-keygroup__note">{group.note}</div>}
                  {group.binds.map((bind) => (
                    <div className="help-keyrow" key={bind.id}>
                      <span className="help-keyrow__keys">
                        {bind.keys.map((k, i) => (
                          <span className="help-keyrow__key-wrap" key={`${bind.id}-${k}-${i}`}>
                            {i > 0 && <span className="help-key-sep">/</span>}
                            <kbd className="help-key">{k}</kbd>
                          </span>
                        ))}
                      </span>
                      <span className="help-keyrow__action">{bind.action}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="help-section" aria-label="Glossary">
            <h3 className="help-section__heading">Glossary</h3>
            <dl className="help-glossary">
              {glossary.map((entry) => (
                <div className="help-glossary__item" key={entry.term}>
                  <dt className="help-glossary__term">{entry.term}</dt>
                  <dd className="help-glossary__def">{entry.summary}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <footer className="help-card__footer">
          Press <kbd className="help-key">F1</kbd> or <kbd className="help-key">Esc</kbd> to close
        </footer>
      </div>
    </div>
  );
}
