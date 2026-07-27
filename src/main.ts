import { mount } from 'svelte';

/* Order matters: these were one stylesheet, and the cascade is load-bearing. */
import './styles/tokens.css';
import './styles/base.css';
import './styles/masthead.css';
import './styles/screens.css';
import './styles/board.css';
import './styles/columns.css';
import './styles/bay.css';
import './styles/draft.css';
import './styles/dice.css';
import './styles/online.css';
import './styles/controls.css';
import './styles/dev.css';
import './styles/responsive.css';

import { showScreen, startMatch } from './lib/game.svelte';
import { hasRun, loadSaved, newRun, RUN } from './lib/run.svelte';
import App from './ui/App.svelte';
import { startTheme } from './ui/theme.svelte';

/* index.html has already picked a sheet for the first paint; this takes the
   choice over, and keeps following the system if that is what was asked. */
startTheme();

/* A run has to exist before the board mounts — every column reads it. */
loadSaved();
const resumed = hasRun() && RUN().active;
if (!resumed) newRun();

mount(App, { target: document.body });

startMatch();
showScreen(resumed ? { kind: 'circuit' } : { kind: 'intro' });
