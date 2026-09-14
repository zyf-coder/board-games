/* global createGame, tryMove, undo, legalMoves, CHAR, chooseMove */

const $ = (sel) => document.querySelector(sel);

const state = {
  game: createGame(),
  mode: 'pvp', // pvp | ai
  humanSide: 'r',
  aiDepth: 2,
  aiThinking: false,
  legalTargets: [],
};

const boardEl = $('#board');
const statusEl = $('#statusLine');
const turnEl = $('#turnPill');
const hintEl = $('#hint');
const modal = $('#modal');
const aiRow = $('#aiRow');

function cellPos(c, r) {
  // board svg uses padding-less 9x10 intersection grid
  const x = ((c + 0.5) / 9) * 100;
  const y = ((r + 0.5) / 10) * 100;
  return { x, y };
}

function drawGrid() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'grid');
  svg.setAttribute('viewBox', '0 0 90 100');
  svg.setAttribute('preserveAspectRatio', 'none');

  const line = (x1, y1, x2, y2, w = 0.45) => {
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', x1);
    l.setAttribute('y1', y1);
    l.setAttribute('x2', x2);
    l.setAttribute('y2', y2);
    l.setAttribute('stroke', '#6b4f12');
    l.setAttribute('stroke-width', w);
    svg.appendChild(l);
  };

  // verticals: edges full, middle stop at river
  for (let c = 0; c <= 8; c++) {
    const x = c * 10 + 5;
    if (c === 0 || c === 8) line(x, 5, x, 95);
    else {
      line(x, 5, x, 45);
      line(x, 55, x, 95);
    }
  }
  for (let r = 0; r <= 9; r++) {
    const y = r * 10 + 5;
    line(5, y, 85, y);
  }

  // palaces
  line(35, 5, 55, 25);
  line(55, 5, 35, 25);
  line(35, 75, 55, 95);
  line(55, 75, 35, 95);

  // river labels
  const t1 = document.createElementNS(ns, 'text');
  t1.setAttribute('x', 22);
  t1.setAttribute('y', 51.5);
  t1.setAttribute('fill', '#6b4f12');
  t1.setAttribute('font-size', '5.2');
  t1.setAttribute('font-family', 'Songti SC, STSong, SimSun, serif');
  t1.textContent = '楚 河';
  svg.appendChild(t1);

  const t2 = document.createElementNS(ns, 'text');
  t2.setAttribute('x', 58);
  t2.setAttribute('y', 51.5);
  t2.setAttribute('fill', '#6b4f12');
  t2.setAttribute('font-size', '5.2');
  t2.setAttribute('font-family', 'Songti SC, STSong, SimSun, serif');
  t2.textContent = '汉 界';
  svg.appendChild(t2);

  boardEl.innerHTML = '';
  boardEl.appendChild(svg);
}

function render() {
  drawGrid();
  const { board, selected, lastMove, turn } = state.game;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const { x, y } = cellPos(c, r);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `piece ${p.side === 'r' ? 'red' : 'black'}`;
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
      btn.textContent = CHAR[p.side][p.type];
      btn.dataset.c = c;
      btn.dataset.r = r;
      btn.setAttribute('aria-label', `${p.side === 'r' ? '红' : '黑'}${CHAR[p.side][p.type]}`);
      if (selected && selected.c === c && selected.r === r) btn.classList.add('selected');
      if (lastMove) {
        if (lastMove.from.c === c && lastMove.from.r === r) btn.classList.add('last-from');
        if (lastMove.to.c === c && lastMove.to.r === r) btn.classList.add('last-to');
      }
      btn.addEventListener('click', onCellClick);
      boardEl.appendChild(btn);
    }
  }

  for (const t of state.legalTargets) {
    const { x, y } = cellPos(t.c, t.r);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `point ${t.capture ? 'capture' : 'legal'}`;
    el.style.left = `${x}%`;
    el.style.top = `${y}%`;
    el.dataset.c = t.c;
    el.dataset.r = t.r;
    el.setAttribute('aria-label', '可走位置');
    el.addEventListener('click', onCellClick);
    boardEl.appendChild(el);
  }

  updateChrome();
}

function updateChrome() {
  const { turn, status } = state.game;
  turnEl.textContent = turn === 'r' ? '红方行棋' : '黑方行棋';
  turnEl.classList.toggle('red', turn === 'r');
  turnEl.classList.toggle('black', turn === 'b');

  if (status === 'check') {
    statusEl.textContent = '将军！';
    statusEl.className = 'status-line warn';
  } else if (status === 'red_win') {
    statusEl.textContent = '红方胜';
    statusEl.className = 'status-line win';
  } else if (status === 'black_win') {
    statusEl.textContent = '黑方胜';
    statusEl.className = 'status-line win';
  } else {
    statusEl.textContent = state.mode === 'ai'
      ? `人机对战 · 你执${state.humanSide === 'r' ? '红' : '黑'}`
      : '双人对战';
    statusEl.className = 'status-line';
  }

  $('#btnUndo').disabled = !state.game.history.length || state.aiThinking;
  if (state.aiThinking) {
    hintEl.textContent = 'AI 思考中…';
  } else if (state.legalTargets.length) {
    hintEl.textContent = '点击高亮位置落子';
  } else {
    hintEl.textContent = '点击己方棋子选中，再点目标位置走子';
  }
}

function isMyTurn() {
  if (state.mode === 'pvp') return true;
  return state.game.turn === state.humanSide;
}

function onCellClick(e) {
  if (state.aiThinking || state.game.status === 'red_win' || state.game.status === 'black_win') return;
  if (!isMyTurn()) return;

  const c = Number(e.currentTarget.dataset.c);
  const r = Number(e.currentTarget.dataset.r);
  const { board, selected, turn } = state.game;
  const p = board[r][c];

  if (selected) {
    const ok = state.legalTargets.some((t) => t.c === c && t.r === r);
    if (ok) {
      commitMove(selected, { c, r });
      return;
    }
  }

  if (p && p.side === turn) {
    state.game.selected = { c, r };
    state.legalTargets = legalMoves(board, c, r).map((t) => ({
      c: t.c,
      r: t.r,
      capture: !!board[t.r][t.c],
    }));
    render();
    return;
  }

  state.game.selected = null;
  state.legalTargets = [];
  render();
}

function commitMove(from, to) {
  const ok = tryMove(state.game, from, to);
  state.game.selected = null;
  state.legalTargets = [];
  render();
  if (!ok) return;

  if (state.game.status === 'red_win' || state.game.status === 'black_win') {
    showEnd(state.game.status === 'red_win' ? '红方胜出' : '黑方胜出');
    return;
  }

  if (state.mode === 'ai' && state.game.turn !== state.humanSide) {
    runAi();
  }
}

function runAi() {
  state.aiThinking = true;
  updateChrome();
  // 让 UI 先刷新，再计算
  setTimeout(() => {
    const side = state.game.turn;
    const mv = chooseMove(state.game.board, side, state.aiDepth);
    state.aiThinking = false;
    if (mv) commitMove(mv.from, mv.to);
    else render();
  }, 80);
}

function showEnd(msg) {
  $('#modalMsg').textContent = msg;
  modal.hidden = false;
}

function resetGame() {
  state.game = createGame();
  state.legalTargets = [];
  state.aiThinking = false;
  modal.hidden = true;
  render();
  if (state.mode === 'ai' && state.humanSide === 'b') runAi();
}

function bindUi() {
  document.querySelectorAll('.btn.mode').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn.mode').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
      aiRow.hidden = state.mode !== 'ai';
      resetGame();
    });
  });

  $('#btnUndo').addEventListener('click', () => {
    if (state.aiThinking) return;
    undo(state.game);
    if (state.mode === 'ai') {
      // 人机模式悔两步，回到自己回合
      if (state.game.turn !== state.humanSide) undo(state.game);
    }
    state.game.selected = null;
    state.legalTargets = [];
    render();
  });

  $('#btnRestart').addEventListener('click', resetGame);
  $('#modalOk').addEventListener('click', () => {
    modal.hidden = true;
  });

  $('#aiDepth').addEventListener('change', (e) => {
    state.aiDepth = Number(e.target.value);
  });

  $('#humanSide').addEventListener('change', (e) => {
    state.humanSide = e.target.value;
    resetGame();
  });

  $('#btnTheme').addEventListener('click', () => {
    document.body.classList.toggle('light');
  });
}

bindUi();
render();
