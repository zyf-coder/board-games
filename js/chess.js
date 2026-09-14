// 中国象棋核心规则：棋盘 9 列 × 10 行，col 0-8 从左到右，row 0 黑方底线在上，row 9 红方底线在下
// 棋子: K将/帅 A士/仕 B象/相 N马 R车 C炮 P兵/卒; side: 'r'红 | 'b'黑

const PALACE = {
  b: { cols: [3, 4, 5], rows: [0, 1, 2] },
  r: { cols: [3, 4, 5], rows: [7, 8, 9] },
};

const HOME = {
  b: { minRow: 0, maxRow: 4 },
  r: { minRow: 5, maxRow: 9 },
};

const VALUE = { K: 10000, R: 900, C: 450, N: 400, B: 200, A: 200, P: 100 };

const CHAR = {
  r: { K: '帅', A: '仕', B: '相', N: '马', R: '车', C: '炮', P: '兵' },
  b: { K: '将', A: '士', B: '象', N: '马', R: '车', C: '炮', P: '卒' },
};

function inBoard(c, r) {
  return c >= 0 && c < 9 && r >= 0 && r < 10;
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function initialBoard() {
  const b = Array.from({ length: 10 }, () => Array(9).fill(null));
  const back = ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R'];
  back.forEach((t, c) => {
    b[0][c] = { type: t, side: 'b' };
    b[9][c] = { type: t, side: 'r' };
  });
  b[2][1] = { type: 'C', side: 'b' };
  b[2][7] = { type: 'C', side: 'b' };
  b[7][1] = { type: 'C', side: 'r' };
  b[7][7] = { type: 'C', side: 'r' };
  [0, 2, 4, 6, 8].forEach((c) => {
    b[3][c] = { type: 'P', side: 'b' };
    b[6][c] = { type: 'P', side: 'r' };
  });
  return b;
}

function inPalace(side, c, r) {
  const p = PALACE[side];
  return p.cols.includes(c) && p.rows.includes(r);
}

function inHome(side, r) {
  const h = HOME[side];
  return r >= h.minRow && r <= h.maxRow;
}

function pieceAt(board, c, r) {
  if (!inBoard(c, r)) return null;
  return board[r][c];
}

function addIf(board, side, moves, c, r) {
  if (!inBoard(c, r)) return;
  const t = board[r][c];
  if (!t || t.side !== side) moves.push({ c, r });
}

function pseudoMoves(board, c, r) {
  const p = board[r][c];
  if (!p) return [];
  const { type, side } = p;
  const moves = [];
  const forward = side === 'r' ? -1 : 1;

  if (type === 'K') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (inPalace(side, nc, nr)) addIf(board, side, moves, nc, nr);
    }
  } else if (type === 'A') {
    const dirs = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (inPalace(side, nc, nr)) addIf(board, side, moves, nc, nr);
    }
  } else if (type === 'B') {
    const dirs = [
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2],
    ];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (!inBoard(nc, nr) || !inHome(side, nr)) continue;
      const mid = pieceAt(board, c + dc / 2, r + dr / 2);
      if (mid) continue;
      addIf(board, side, moves, nc, nr);
    }
  } else if (type === 'N') {
    const jumps = [
      [2, 1, 1, 0],
      [2, -1, 1, 0],
      [-2, 1, -1, 0],
      [-2, -1, -1, 0],
      [1, 2, 0, 1],
      [-1, 2, 0, 1],
      [1, -2, 0, -1],
      [-1, -2, 0, -1],
    ];
    for (const [dc, dr, bc, br] of jumps) {
      if (pieceAt(board, c + bc, r + br)) continue;
      addIf(board, side, moves, c + dc, r + dr);
    }
  } else if (type === 'R') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dc, dr] of dirs) {
      let nc = c + dc;
      let nr = r + dr;
      while (inBoard(nc, nr)) {
        const t = board[nr][nc];
        if (!t) {
          moves.push({ c: nc, r: nr });
        } else {
          if (t.side !== side) moves.push({ c: nc, r: nr });
          break;
        }
        nc += dc;
        nr += dr;
      }
    }
  } else if (type === 'C') {
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dc, dr] of dirs) {
      let nc = c + dc;
      let nr = r + dr;
      let jumped = false;
      while (inBoard(nc, nr)) {
        const t = board[nr][nc];
        if (!jumped) {
          if (!t) moves.push({ c: nc, r: nr });
          else jumped = true;
        } else if (t) {
          if (t.side !== side) moves.push({ c: nc, r: nr });
          break;
        }
        nc += dc;
        nr += dr;
      }
    }
  } else if (type === 'P') {
    addIf(board, side, moves, c, r + forward);
    if (!inHome(side, r)) {
      addIf(board, side, moves, c - 1, r);
      addIf(board, side, moves, c + 1, r);
    }
  }
  return moves;
}

function findKing(board, side) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'K' && p.side === side) return { c, r };
    }
  }
  return null;
}

function kingsFacing(board) {
  const rk = findKing(board, 'r');
  const bk = findKing(board, 'b');
  if (!rk || !bk || rk.c !== bk.c) return false;
  const c = rk.c;
  const [min, max] = rk.r < bk.r ? [rk.r, bk.r] : [bk.r, rk.r];
  for (let r = min + 1; r < max; r++) {
    if (board[r][c]) return false;
  }
  return true;
}

function isAttacked(board, c, r, bySide) {
  for (let rr = 0; rr < 10; rr++) {
    for (let cc = 0; cc < 9; cc++) {
      const p = board[rr][cc];
      if (!p || p.side !== bySide) continue;
      const ms = pseudoMoves(board, cc, rr);
      if (ms.some((m) => m.c === c && m.r === r)) return true;
    }
  }
  return false;
}

function inCheck(board, side) {
  const k = findKing(board, side);
  if (!k) return true;
  const enemy = side === 'r' ? 'b' : 'r';
  return isAttacked(board, k.c, k.r, enemy) || kingsFacing(board);
}

function applyMove(board, from, to) {
  const nb = cloneBoard(board);
  nb[to.r][to.c] = nb[from.r][from.c];
  nb[from.r][from.c] = null;
  return nb;
}

function legalMoves(board, c, r) {
  const p = board[r][c];
  if (!p) return [];
  return pseudoMoves(board, c, r).filter((to) => {
    const nb = applyMove(board, { c, r }, to);
    return !inCheck(nb, p.side);
  });
}

function allLegalMoves(board, side) {
  const out = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p || p.side !== side) continue;
      for (const to of legalMoves(board, c, r)) {
        out.push({ from: { c, r }, to, piece: p });
      }
    }
  }
  return out;
}

function evaluate(board) {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      let v = VALUE[p.type];
      if (p.type === 'P' && !inHome(p.side, r)) v += 40;
      if (p.type === 'N' || p.type === 'C') v += 5;
      score += p.side === 'b' ? v : -v;
    }
  }
  return score;
}

function createGame() {
  return {
    board: initialBoard(),
    turn: 'r',
    selected: null,
    history: [],
    status: 'playing', // playing | check | red_win | black_win | draw
    lastMove: null,
  };
}

function tryMove(game, from, to) {
  const p = game.board[from.r][from.c];
  if (!p || p.side !== game.turn) return false;
  const legal = legalMoves(game.board, from.c, from.r);
  if (!legal.some((m) => m.c === to.c && m.r === to.r)) return false;

  const captured = game.board[to.r][to.c];
  const next = applyMove(game.board, from, to);
  game.history.push({
    board: cloneBoard(game.board),
    turn: game.turn,
    lastMove: game.lastMove,
    status: game.status,
  });
  game.board = next;
  game.lastMove = { from: { ...from }, to: { ...to }, captured };
  game.turn = game.turn === 'r' ? 'b' : 'r';
  game.selected = null;

  if (captured && captured.type === 'K') {
    game.status = p.side === 'r' ? 'red_win' : 'black_win';
  } else {
    const moves = allLegalMoves(game.board, game.turn);
    if (moves.length === 0) {
      game.status = game.turn === 'r' ? 'black_win' : 'red_win';
    } else if (inCheck(game.board, game.turn)) {
      game.status = 'check';
    } else {
      game.status = 'playing';
    }
  }
  return true;
}

function undo(game) {
  const prev = game.history.pop();
  if (!prev) return false;
  game.board = prev.board;
  game.turn = prev.turn;
  game.lastMove = prev.lastMove;
  game.status = prev.status;
  game.selected = null;
  return true;
}

// AI: 极大极小 + 随机扰动，深度按难度
function chooseMove(board, side, depth = 2) {
  const moves = allLegalMoves(board, side);
  if (!moves.length) return null;
  const enemy = side === 'r' ? 'b' : 'r';

  function search(bd, sd, d, alpha, beta) {
    if (d === 0) {
      const e = evaluate(bd);
      return side === 'b' ? e : -e;
    }
    const ms = allLegalMoves(bd, sd);
    if (!ms.length) {
      const e = inCheck(bd, sd) ? -99999 : 0;
      return side === 'b' ? e : -e;
    }
    const nextSide = sd === 'r' ? 'b' : 'r';
    if (sd === side) {
      let best = -Infinity;
      for (const m of ms) {
        const nb = applyMove(bd, m.from, m.to);
        const v = search(nb, nextSide, d - 1, alpha, beta);
        if (v > best) best = v;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of ms) {
      const nb = applyMove(bd, m.from, m.to);
      const v = search(nb, nextSide, d - 1, alpha, beta);
      if (v < best) best = v;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = -Infinity;
  let candidates = [];
  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to);
    let v = search(nb, enemy, depth - 1, -Infinity, Infinity);
    // 吃子加成，让 AI 更积极
    if (m.to && board[m.to.r][m.to.c]) {
      v += VALUE[board[m.to.r][m.to.c].type] * 0.15;
    }
    v += Math.random() * 8;
    if (v > best + 0.01) {
      best = v;
      candidates = [m];
    } else if (Math.abs(v - best) < 0.01) {
      candidates.push(m);
    }
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

if (typeof module !== 'undefined') {
  module.exports = {
    initialBoard,
    createGame,
    tryMove,
    undo,
    legalMoves,
    allLegalMoves,
    inCheck,
    chooseMove,
    CHAR,
    VALUE,
  };
}
