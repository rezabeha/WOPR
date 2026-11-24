# JOSHUA — W.O.P.R. Terminal

A browser-local, unofficial fan-made terminal inspired by *WarGames* (1983). Open the hosted site, wait for `CONNECT 1200`, and type at `LOGON:`. `HELP` opens the operator reference. Successive `HINT` commands uncover the simulated account. Visitors can play without registering.

## Operating the terminal

- Enter submits a line. An empty Enter finishes the current transmission. Up and down recall earlier input. Touch users can type with the device keyboard, use the return control, and tap game choices.
- F1 opens Help. F2 opens Settings. F3 reconnects. F4 toggles full screen. Browsers that reserve a function key also accept the on-screen control or typed command. Escape closes a panel. Where native full screen is unavailable, the terminal expands within the page.
- `LOGOFF` hangs up. `RECONNECT` repeats the dial sequence. `LIST GAMES` opens the directory after logon. A title or directory number selects a game. `EXIT` returns to the shell and preserves the game. Select it again to resume. `NEW GAME` restarts the active module.
- `STATUS`, `WHOAMI`, `DIR`, `DIAG`, `VER`, `DATE`, `TIME`, `CLEAR` and `SOURCE` are shell utilities. `SOURCE` opens the documentation and source download. Try asking about Falken, giving your name, asking for a follow-up, or discussing a previous game.
- The device stores visual/audio preferences across visits. A browser tab stores its transcript, conversation details, chess history, cards, board positions and simulation progress in session storage. Refresh resumes that tab. Closing a tab normally ends the session. Browsers that restrict storage can still run the terminal, with in-memory progress.

## Game bank

| Directory | Module | Behavior |
| --- | --- | --- |
| 02 | BLACK JACK | Four-deck shoe, 1,000 training chips, initial stake 20. `HIT`, `STAND`, `DOUBLE`, `SPLIT`, `BET 25`, `DEAL`, `BALANCE`, `RULES`. The dealer stands on soft 17. Naturals pay 3:2, a push returns the stake, and a split is allowed once. Split aces receive one card each. There is no insurance, surrender or cash wagering. `NEW GAME` restores the training bank. |
| 07 | CHESS | Play White against Joshua. `LEVEL CADET`, `LEVEL OPERATOR` and `LEVEL EXPERT` adjust search depth and time. `BOARD`, `GRAPHIC`, `ASCII`, `HINT`, `OPENING`, `HISTORY`, `UNDO`, `RESIGN`, `CLAIM DRAW` and `NEW GAME` operate on the same position. |
| 09 | TIC-TAC-TOE | The operator plays X. Choose squares 1–9 in reading order or tap a cell. `ZERO PLAYERS` or `LEARN` runs 4,096 fully played minimax games, tracking both wins and draws. `SKIP` completes the remaining calculations immediately. |
| 10 | GLOBAL THERMONUCLEAR WAR | Select an exercise side and one of three fictional scenarios. `VERIFY SIGNAL`, `OPEN CHANNEL`, `HOLD`, `ESCALATE`, `STAND DOWN` and `CONTINUE` branch according to the current phase. Compare the transcript, radar, DEFCON and decision timer. |

The directory marks Falken’s Maze, Gin Rummy, Hearts, Bridge, Checkers and Poker as offline archives. Selecting an archive reports its status.

### Chess notation and rules

`P-K4`, `PAWN TO KING FOUR`, `e4`, and `e2e4` enter the same first move. Examples after `1. e4 e5` include `Nf3`, `g1f3` and `KNIGHT TO KING BISHOP THREE`. The parser matches candidate inputs against the legal move list. Descriptive ranks count from the moving player’s side. `PXP` and combinations such as `QKT-QB3` work when they identify one legal move. Ambiguous moves request an origin square. Historical descriptive notation had several dialects. Coordinate notation is the fallback for uncommon abbreviations.

`O-O` and `O-O-O` castle when legal. `e8=N` or `e7e8n` specifies underpromotion. Entering promotion coordinates alone prompts for a piece. Checkmate, stalemate, en passant, insufficient material, fivefold repetition and the 75-move rule are handled. `CLAIM DRAW` handles a qualifying threefold or 50-move claim. `CLAIM DRAW <move>` checks an intended legal move. `UNDO` takes back a human/computer turn, or only the human move if Joshua has not replied. `OPENING` names and explains positions covered by the opening file. Graphic mode accepts two square selections. Uppercase ASCII pieces are White.

The opponent uses a compact local engine with an opening book, iterative deepening, alpha–beta search, move ordering, positional evaluation and a bounded capture search. Search runs in a module worker with a local fallback. The difficulty labels describe search budgets. They are not Elo ratings. There are no clocks, network opponents or tablebases.

### Exercise and learning

Echo Drift, Polar Silence and Glass Horizon present distinct pieces of evidence. A bilateral stand-down, unilateral restraint, a resolved false alarm and mutual loss are possible. The exercise then compares 4,096 abstract counterfactuals with 4,096 perfect tic-tac-toe games. Decisions and communication influence each comparison run. In this fictional model a committed exchange breaks both stations, while reciprocal contact can preserve both. The terminal reports the observed outcomes and then delivers its conclusion. The map uses ordinary geographic coastlines. Its station identifiers and track endpoints are invented display elements. There are no target coordinates, real installations, external military feeds or operational inputs.

### Display, sound and accessibility

The Settings panel controls typing speed, simulation speed, scanlines, glow, flicker, curvature, cursor blinking, contrast and instrument motion. The globe, carrier wave, exercise tracks and self-play boards also have individual motion switches. A first visit honors the browser’s reduced-motion preference. Closing the settings panel restores focus. The final transcript response has a polite live-region announcement.

Audio starts muted. At `LOGON:`, click **SOUND OFF** to hear the modem handshake, even if the connection has already completed. `RECONNECT` plays it again while sound is enabled. After a refresh, **RESUME SOUND** indicates a saved preference waiting for your first click or keystroke.

Type `TEST SOUND` at any prompt, or open **F2 Settings → Test sound**, to play two notes and measure the signal going to the browser. The output volume slider controls the effects and Joshua’s voice. Modem, keyboard, terminal, radar and activity sounds each have a switch. Enabling Joshua’s voice in Settings previews the browser’s speech synthesizer. If the test reports a signal but you hear silence, check the tab’s mute setting and the selected speaker or headphones.

## Source layout

| Location | Responsibility |
| --- | --- |
| `dist/index.html`, `dist/terminal.css` | Accessible terminal, responsive display and CRT effects |
| `dist/js/app.js` | Input, typewriter, session storage, preferences, timers and worker coordination |
| `dist/js/terminal.js`, `views.js` | Command interpretation, session memory, static and live views |
| `dist/js/chess.js`, `search.js`, `chess-worker.js` | Notation, game records, opening file and opponent |
| `dist/vendor/chess.js` | Vendored chess.js 0.13.4, with a small reversible-move adapter for the search worker |
| `dist/js/tictac.js`, `blackjack.js`, `war.js` | Standalone game rules and progression |
| `dist/js/visuals.js`, `audio.js`, `dist/assets/` | Projected vector globe, synthetic tracks, carrier signal, audio and local assets |
| `tests/` | Regression tests runnable with Node’s built-in test runner |
| `scripts/source-archive.py` | Rebuild the downloadable source ZIP and plain-text README |
| `scripts/standalone.py` | Build the offline HTML edition with its embedded source archive |

## Run, test and deploy

With Python 3, start a static HTTP server from the project root and open its displayed address. Browser modules and the map data require HTTP.

```sh
python3 -m http.server --directory dist 8000
```

With Node.js 20 or newer, run the regression suite. No package installation or API keys are required.

```sh
node --test tests/*.test.js
python3 scripts/source-archive.py
```

Run `python3 scripts/standalone.py` to rebuild `WOPR-Terminal.html` alongside this README. Open that single file in a modern browser to run the same terminal and sound controls offline.

For ChatGPT Sites, register the Site, select `dist` as the static directory in `.openai/hosting.json`, push the matching source state, save the packaged version, and publish it with public access. The ZIP omits the original hosting identity so another operator can register their own Site. Any static HTTP host can serve the same `dist` directory. All application resources ship together.

Tests cover the four first-move spellings, both castling directions, illegal castling, en passant, pins, underpromotion, mate, draw rules, opening search, user commands, session serialization, blackjack settlement, every human tic-tac-toe continuation against the shipped opponent and both sides of each war scenario. The starting chess position produces 197,281 legal leaf positions at depth four.

## Credits

Chess rules use Jeff Hlywa’s chess.js v0.13.4 under its BSD 2-Clause license. Its copyright and full terms remain at the top of `dist/vendor/chess.js`. Upstream source: https://github.com/jhlywa/chess.js/tree/v0.13.4 .

The coastline geometry and derived land dots use Natural Earth’s public-domain 1:110m land. Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson . Graphics, audio synthesis and terminal presentation are generated locally. The application is an independent fan project.
