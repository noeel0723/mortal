import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { ProfileInput } from '../src/engine/types';
import { en } from '../src/i18n/en';
import { useGame } from './browserStore';
import { Achievements, CustomLife, NewLife, SavedLives, Settings, Welcome } from './menu';
import { Play } from './play';
import { pageTitles } from './playPages';
import type { GamePage } from './playPages';
import { Button, Feedback, Heading, Mark } from './ui';

const readHash = () => window.location.hash;
function listen(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}

function navigate(page = '', replace = false) {
  useGame.getState().clearMessage();
  if (replace) window.location.replace(`#${page}`);
  else window.location.hash = page;
}

function playUrl(id: string, page: GamePage = 'journal', person?: string) {
  return `play/${id}/${page}${person ? `/${person}` : ''}`;
}

export function App() {
  const { ready, busy, slot, problem, initialize, start, open } = useGame();
  const hash = useSyncExternalStore(listen, readHash);
  const [section, routeId, routePage, detail] = hash.slice(1).split('/');
  const playId = section === 'play' && routeId && /^[a-z0-9-]+$/.test(routeId) ? routeId : undefined;
  const activeLife = playId && slot?.id === playId ? slot.life : undefined;
  const page: GamePage = routePage && Object.hasOwn(pageTitles, routePage) ? routePage as GamePage : 'journal';
  const loadedId = slot?.id;
  const attemptedId = useRef<string | null>(null);

  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    if (!playId || playId === loadedId) {
      attemptedId.current = null;
    } else if (ready && !busy && attemptedId.current !== playId) {
      attemptedId.current = playId;
      void open(playId);
    }
  }, [ready, busy, playId, loadedId, open]);
  useEffect(() => { window.scrollTo(0, 0); }, [hash]);

  function enter(id: string) {
    const saved = useGame.getState().saves.find((item) => item.id === id);
    navigate(playUrl(id, saved?.completed ? 'summary' : 'journal'));
  }
  async function begin(profile?: ProfileInput) {
    if (!await start(profile)) return;
    const id = useGame.getState().slot?.id;
    if (id) enter(id);
  }

  let content;
  if (section === 'play') {
    content = activeLife && playId ? <Play key={playId} life={activeLife} page={page} personId={detail}
      go={(next, person, replace) => navigate(playUrl(playId, next, person), replace)} home={() => navigate()} newLife={() => navigate('new')} /> :
      <main className="inner" id="main">
        <Heading title={problem || !playId ? 'Life unavailable' : 'Opening your life…'} />
        <Feedback error={problem} />
        <Button icon="load" disabled={busy} onClick={() => navigate('saves')}>Saved Lives</Button>
      </main>;
  } else if (section === 'new') {
    content = <NewLife start={() => void begin()} customize={() => navigate('custom')} />;
  } else if (section === 'custom') {
    content = <CustomLife start={(profile) => void begin(profile)} cancel={() => navigate('new')} />;
  } else if (section === 'saves') {
    content = <SavedLives open={enter} />;
  } else if (section === 'achievements' || section === 'settings') {
    content = <main className="inner" id="main">
      <Heading title={section === 'achievements' ? 'Achievements' : 'Settings'} />
      <section className="surface panel">{section === 'achievements' ? <Achievements /> : <Settings />}</section>
    </main>;
  } else {
    content = <Welcome onOpen={enter} navigate={navigate} />;
  }

  return <div className="mortal-frame">
    {(!activeLife || page === 'journal') && <header className="masthead">
      <div className="masthead-inner">
        <button type="button" className="brand" aria-label="Mortal Main Menu" disabled={busy} onClick={() => navigate()}>
          <Mark /><span>{en.title}</span>
        </button>
        {activeLife && playId ? <Button icon="settings" kind="quiet" onClick={() => navigate(playUrl(playId, 'menu'))}>Life Menu</Button> :
          section ? <Button icon="home" kind="quiet" onClick={() => navigate()}>Main Menu</Button> : null}
      </div>
    </header>}
    {activeLife ? content : <div className="frame-scroll" key={hash}>{content}</div>}
  </div>;
}
