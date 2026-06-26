// ========== 围棋小游戏 ==========
setTimeout(() => {
  let goGame = null;

  window.openGoPage = function(userId) {
    hideAllPages();
    document.getElementById('goPage').classList.add('active');
    if (!goGame) {
      goGame = new GoGame('goPageContent', userId);
    } else {
      goGame.userId = userId;
      goGame.reset();
    }
  };

  class GoGame {
    constructor(containerId, userId) {
      this.container = document.getElementById(containerId);
      this.userId = userId;
      this.size = 19;
      this.cellSize = 0;
      this.padding = 10;
      this.board = [];
      this.currentPlayer = 'me';
      this.gameOver = false;
      this.meColor = 'black';
      this.mjColor = 'white';
      this.moveHistory = [];
      this.passCount = 0;
      this.capturedByMe = 0;
      this.capturedByMJ = 0;
      this.difficulty = 'medium';
      this.lastMJMove = null;
      this.boundResize = () => this.adjustCanvasSize();
      this.initUI();
    }

    initUI() {
      this.container.innerHTML = '';
      this.container.style.overflowY = 'auto';
      this.container.style.webkitOverflowScrolling = 'touch';
      const pageHeader = this.container.closest('.page')?.querySelector('.full-page-header');
      if (pageHeader) {
        pageHeader.style.position = 'sticky';
        pageHeader.style.top = '0';
        pageHeader.style.zIndex = '10';
      }
      const contact = getContact(this.userId);

      // ---- 顶部信息栏（MJ）----
      const topBar = document.createElement('div');
      topBar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;width:100%;max-width:400px;margin:0 auto;';

      const mjAvatar = document.createElement('div');
      mjAvatar.className = 'gomoku-avatar';
      mjAvatar.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;';
      if (contact && contact.avt) {
        mjAvatar.innerHTML = `<img src="${contact.avt}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        mjAvatar.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/></svg>`;
      }
      topBar.appendChild(mjAvatar);

      this.mjStoneIndicator = document.createElement('span');
      this.mjStoneIndicator.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;';
      topBar.appendChild(this.mjStoneIndicator);

      this.mjNameSpan = document.createElement('span');
      this.mjNameSpan.style.cssText = 'font-weight:bold;color:var(--text-primary);font-size:14px;';
      this.mjNameSpan.textContent = (contact ? contact.name : '梦角') + ' · 吃子:' + this.capturedByMJ;
      topBar.appendChild(this.mjNameSpan);

      this.mjColorText = document.createElement('span');
      this.mjColorText.style.cssText = 'font-size:12px;color:var(--text-secondary);';
      topBar.appendChild(this.mjColorText);

      this.container.appendChild(topBar);

      // ---- 棋盘区域 ----
      const boardContainer = document.createElement('div');
      boardContainer.style.cssText = 'position:relative;display:flex;justify-content:center;width:100%;max-width:400px;margin:0 auto;';
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'goCanvas';
      this.canvas.style.cssText = 'width:100%;max-width:360px;display:block;';
      boardContainer.appendChild(this.canvas);
      this.container.appendChild(boardContainer);

      // ---- 底部信息栏（我）----
      const bottomBar = document.createElement('div');
      bottomBar.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:8px 12px;width:100%;max-width:400px;margin:0 auto;';

      this.meColorText = document.createElement('span');
      this.meColorText.style.cssText = 'font-size:12px;color:var(--text-secondary);';
      bottomBar.appendChild(this.meColorText);

      this.meNameSpan = document.createElement('span');
      this.meNameSpan.style.cssText = 'font-weight:bold;color:var(--text-primary);font-size:14px;';
      this.meNameSpan.textContent = appData.myProfile.name + ' · 吃子:' + this.capturedByMe;
      bottomBar.appendChild(this.meNameSpan);

      this.meStoneIndicator = document.createElement('span');
      this.meStoneIndicator.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;';
      bottomBar.appendChild(this.meStoneIndicator);

      const meAvatar = document.createElement('div');
      meAvatar.className = 'gomoku-avatar';
      meAvatar.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden;flex-shrink:0;';
      if (appData.myProfile.avt) {
        meAvatar.innerHTML = `<img src="${appData.myProfile.avt}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        meAvatar.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/></svg>`;
      }
      bottomBar.appendChild(meAvatar);

      this.container.appendChild(bottomBar);

      // ---- 状态和按钮 ----
      this.statusDiv = document.createElement('div');
      this.statusDiv.className = 'gomoku-status';
      this.statusDiv.textContent = '请选择难度';
      this.container.appendChild(this.statusDiv);

      const btnRow = document.createElement('div');
btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;';

// 悔棋
this.undoBtn = document.createElement('button');
this.undoBtn.className = 'gomoku-btn';
this.undoBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('undo')}</svg> 悔棋`;
this.undoBtn.onclick = () => this.requestUndo();
btnRow.appendChild(this.undoBtn);

// 弃权
this.passBtn = document.createElement('button');
this.passBtn.className = 'gomoku-btn';
this.passBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('minus')}</svg> 弃权`;
this.passBtn.onclick = () => this.passTurn();
btnRow.appendChild(this.passBtn);

// 认输
this.resignBtn = document.createElement('button');
this.resignBtn.className = 'gomoku-btn';
this.resignBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('x')}</svg> 认输`;
this.resignBtn.onclick = () => {
  if (this.gameOver) return;
  showConfirm('确定认输吗？', () => {
    this.gameOver = true;
    this.statusDiv.textContent = '你认输了，梦角赢了';
  });
};
btnRow.appendChild(this.resignBtn);

// 求和
this.drawBtn = document.createElement('button');
this.drawBtn.className = 'gomoku-btn';
this.drawBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('hand')}</svg> 求和`;
this.drawBtn.onclick = () => {
  if (this.gameOver) return;
  const agree = Math.random() < 0.5;
  if (agree) {
    this.gameOver = true;
    this.statusDiv.textContent = '梦角同意求和 · 平局';
    toast('梦角同意求和');
  } else {
    toast('梦角不同意求和，继续对局');
    this.showGoBubble('mj', '我还能再战，继续吧！');
  }
};
btnRow.appendChild(this.drawBtn);

// 互动消息
this.chatBtn = document.createElement('button');
this.chatBtn.className = 'gomoku-btn';
this.chatBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('message-circle')}</svg> 消息`;
this.chatBtn.onclick = () => this.showGoChatPanel();
btnRow.appendChild(this.chatBtn);

// 求放过
this.mercyBtn = document.createElement('button');
this.mercyBtn.className = 'gomoku-btn';
this.mercyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('heart')}</svg> 求放过`;
this.mercyBtn.onclick = () => {
  if (this.gameOver) return;
  this.mercyRequested = true;
  const responses = ['好吧，这步让你', '看你可怜，饶你一次', '下次可不会了哦', '行吧，不吃了'];
  const msg = responses[Math.floor(Math.random() * responses.length)];
  this.showGoBubble('mj', msg);
  toast('求放过成功，对方下一步会让着你');
};
btnRow.appendChild(this.mercyBtn);

// 重来
this.resetBtn = document.createElement('button');
this.resetBtn.className = 'gomoku-btn';
this.resetBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('refresh-cw')}</svg> 重来`;
this.resetBtn.onclick = () => this.reset();
btnRow.appendChild(this.resetBtn);
      this.container.appendChild(btnRow);

      this.canvas.addEventListener('click', (e) => this.handleClick(e));
      window.addEventListener('resize', this.boundResize);

      this.updateStoneIndicators();
      this.resetBoard();

      setTimeout(() => {
        this.adjustCanvasSize();
        this.showDifficultySelect();
      }, 100);
    }

    showDifficultySelect() {
      const overlay = document.createElement('div');
      overlay.className = 'mask show';
      const card = document.createElement('div');
      card.className = 'pop-card'; card.style.width = '280px';
      const header = document.createElement('div');
      header.className = 'pop-header'; header.textContent = '选择难度';
      card.appendChild(header);
      const body = document.createElement('div');
      body.className = 'pop-body';
      body.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
      const modes = [
        { label: '简单', value: 'easy', desc: '随机落子，适合学习围棋' },
        { label: '中等', value: 'medium', desc: '会吃子和救子，有初步意识' },
        { label: '困难', value: 'hard', desc: '有攻防意识，会预判布局' }
      ];
      modes.forEach(mode => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = 'width:100%;text-align:left;padding:10px;';
        btn.innerHTML = `<b>${mode.label}</b><br><span style="font-size:11px;color:var(--text-secondary);">${mode.desc}</span>`;
        btn.onclick = () => { overlay.remove(); this.difficulty = mode.value; this.showColorSelect(); };
        body.appendChild(btn);
      });
      card.appendChild(body);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    showColorSelect() {
      const overlay = document.createElement('div');
      overlay.className = 'mask show';
      const card = document.createElement('div');
      card.className = 'pop-card'; card.style.width = '280px';
      const header = document.createElement('div');
      header.className = 'pop-header'; header.textContent = '选择棋子颜色';
      card.appendChild(header);
      const body = document.createElement('div');
      body.className = 'pop-body';
      body.style.cssText = 'display:flex;gap:10px;justify-content:center;';
      const blackBtn = document.createElement('button');
      blackBtn.className = 'btn-primary';
      blackBtn.textContent = '黑棋（先手）';
      blackBtn.onclick = () => {
        overlay.remove();
        this.meColor = 'black'; this.mjColor = 'white'; this.currentPlayer = 'me';
        this.updateStoneIndicators();
        this.adjustCanvasSize();
        this.startGame();
      };
      const whiteBtn = document.createElement('button');
      whiteBtn.className = 'btn';
      whiteBtn.textContent = '白棋（后手）';
      whiteBtn.onclick = () => {
        overlay.remove();
        this.meColor = 'white'; this.mjColor = 'black'; this.currentPlayer = 'mj';
        this.updateStoneIndicators();
        this.adjustCanvasSize();
        this.startGame();
      };
      body.appendChild(blackBtn); body.appendChild(whiteBtn);
      card.appendChild(body);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }

    updateStoneIndicators() {
      if (this.meColor === 'black') {
        this.meStoneIndicator.style.background = '#333'; this.meStoneIndicator.style.border = 'none';
      } else {
        this.meStoneIndicator.style.background = '#fff'; this.meStoneIndicator.style.border = '2px solid #333';
      }
      this.meColorText.textContent = this.meColor === 'black' ? '黑棋' : '白棋';
      if (this.mjColor === 'black') {
        this.mjStoneIndicator.style.background = '#333'; this.mjStoneIndicator.style.border = 'none';
      } else {
        this.mjStoneIndicator.style.background = '#fff'; this.mjStoneIndicator.style.border = '2px solid #333';
      }
      this.mjColorText.textContent = this.mjColor === 'black' ? '黑棋' : '白棋';
    }

    startGame() {
      const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
      this.statusDiv.textContent = '围棋 · ' + diffLabels[this.difficulty] + ' · ' + (this.currentPlayer === 'me' ? '轮到你落子了' : '梦角思考中...');
      if (this.currentPlayer === 'mj') {
        setTimeout(() => this.mjMove(), 500 + Math.random() * 1500);
      }
    }

    updateScoreDisplay() {
      if (this.mjNameSpan) this.mjNameSpan.textContent = (getContact(this.userId)?.name || '梦角') + ' · 吃子:' + this.capturedByMJ;
      if (this.meNameSpan) this.meNameSpan.textContent = appData.myProfile.name + ' · 吃子:' + this.capturedByMe;
    }

    getLiberties(row, col) {
      const player = this.board[row][col];
      if (!player) return [];
      const visited = new Set();
      const liberties = [];
      const queue = [[row, col]];
      visited.add(`${row},${col}`);
      while (queue.length > 0) {
        const [r, c] = queue.shift();
        const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;
          if (this.board[nr][nc] === player) {
            visited.add(key); queue.push([nr, nc]);
          } else if (this.board[nr][nc] === null) {
            if (!liberties.some(l => l[0] === nr && l[1] === nc)) liberties.push([nr, nc]);
          }
        }
      }
      return liberties;
    }

    isValidMove(row, col, player) {
      if (this.board[row][col] !== null) return false;
      this.board[row][col] = player;
      let captured = false;
      const neighbors = [[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] && this.board[nr][nc] !== player) {
          const libs = this.getLiberties(nr, nc);
          if (libs.length === 0) captured = true;
        }
      }
      const ownLibs = this.getLiberties(row, col);
      this.board[row][col] = null;
      return ownLibs.length > 0 || captured;
    }

    placeStone(row, col, player) {
      this.board[row][col] = player;
      if (player === 'mj') { this.lastMJMove = { row, col }; } else { this.lastMJMove = null; }
      this.moveHistory.push({ row, col, player });

      const neighbors = [[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
      for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] && this.board[nr][nc] !== player) {
          const libs = this.getLiberties(nr, nc);
          if (libs.length === 0) this.removeGroup(nr, nc, player);
        }
      }

      this.drawBoard();
      this.updateScoreDisplay();

      if (this.passCount >= 2) { this.endGame(); return; }
      this.passCount = 0;
      this.switchPlayer();
    }

    removeGroup(row, col, capturingPlayer) {
      const player = this.board[row][col];
      const visited = new Set();
      const queue = [[row, col]];
      visited.add(`${row},${col}`);
      while (queue.length > 0) {
        const [r, c] = queue.shift();
        this.board[r][c] = null;
        if (capturingPlayer === 'me') this.capturedByMe++; else this.capturedByMJ++;
        const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
          const key = `${nr},${nc}`;
          if (visited.has(key)) continue;
          if (this.board[nr][nc] === player) { visited.add(key); queue.push([nr, nc]); }
        }
      }
    }

    passTurn() { if (this.gameOver) return; this.passCount++; this.switchPlayer(); }

    endGame() {
      this.gameOver = true;
      if (this.capturedByMe > this.capturedByMJ) this.statusDiv.textContent = '🎉 你赢了！（吃子:' + this.capturedByMe + ' vs ' + this.capturedByMJ + '）';
      else if (this.capturedByMJ > this.capturedByMe) this.statusDiv.textContent = '梦角赢了（吃子:' + this.capturedByMJ + ' vs ' + this.capturedByMe + '）';
      else this.statusDiv.textContent = '平局（吃子数相同）';
    }

    switchPlayer() {
      this.currentPlayer = this.currentPlayer === 'me' ? 'mj' : 'me';
      const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
      if (this.currentPlayer === 'me') this.statusDiv.textContent = '围棋 · ' + diffLabels[this.difficulty] + ' · 轮到你落子了';
      else { this.statusDiv.textContent = '围棋 · ' + diffLabels[this.difficulty] + ' · 梦角思考中...'; setTimeout(() => this.mjMove(), 500 + Math.random() * 1500); }
    }

    handleClick(e) {
      if (this.gameOver || this.currentPlayer !== 'me') return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width, scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
      const col = Math.round((x - this.padding) / this.cellSize), row = Math.round((y - this.padding) / this.cellSize);
      if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;
      if (!this.isValidMove(row, col, 'me')) return;
      this.placeStone(row, col, 'me');
    }

    // ========== AI 核心方法 ==========

getLibertiesAfterMove(row, col, player) {
    this.board[row][col] = player;
    const libs = this.getLiberties(row, col);
    this.board[row][col] = null;
    return libs.length;
}

getCaptureCount(row, col, player) {
    this.board[row][col] = player;
    let count = 0;
    const neighbors = [[row-1,col],[row+1,col],[row,col-1],[row,col+1]];
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] && this.board[nr][nc] !== player) {
            const libs = this.getLiberties(nr, nc);
            if (libs.length === 0) count += this.countGroup(nr, nc);
        }
    }
    this.board[row][col] = null;
    return count;
}

countGroup(row, col) {
    const player = this.board[row][col];
    if (!player) return 0;
    const visited = new Set();
    const queue = [[row, col]];
    visited.add(`${row},${col}`);
    let count = 0;
    while (queue.length > 0) {
        const [r, c] = queue.shift();
        count++;
        const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
        for (const [nr, nc] of neighbors) {
            if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
            const key = `${nr},${nc}`;
            if (visited.has(key)) continue;
            if (this.board[nr][nc] === player) {
                visited.add(key);
                queue.push([nr, nc]);
            }
        }
    }
    return count;
}
// 获取所有合法空位的分数列表（供 mjMove 排序用）
getAllMovesWithScore(mode) {
    const list = [];
    for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
            if (!this.isValidMove(r, c, 'mj')) continue;
            const libsAfter = this.getLibertiesAfterMove(r, c, 'mj');
            const captures = this.getCaptureCount(r, c, 'mj');
            if (libsAfter === 0 && captures === 0) continue;
            if (mode === 'medium') {
                list.push({ row: r, col: c, score: this.mediumScore(r, c, libsAfter, captures) });
            } else if (mode === 'hard') {
                list.push({ row: r, col: c, score: this.hardScore(r, c, libsAfter, captures) });
            }
        }
    }
    return list;
}

// 简易评分（供简单模式用）
getAllMoves() {
    const list = [];
    for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
            if (!this.isValidMove(r, c, 'mj')) continue;
            const libsAfter = this.getLibertiesAfterMove(r, c, 'mj');
            const captures = this.getCaptureCount(r, c, 'mj');
            if (libsAfter === 0 && captures === 0) continue;
            if (libsAfter === 1 && captures === 0) continue;
            let score = captures * 80 + Math.random() * 15;
            list.push({ row: r, col: c, score });
        }
    }
    return list;
}

// 中等模式评分（从 getMediumMove 提取）
mediumScore(r, c, libsAfter, captures) {
    let score = captures * 200;
    this.board[r][c] = 'mj';
    const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] === 'me') {
            const enemyLibs = this.getLiberties(nr, nc);
            if (enemyLibs.length === 1) score += 200;
            else if (enemyLibs.length === 2) score += 80;
        }
    }
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] === 'mj') {
            const ownLibs = this.getLiberties(nr, nc);
            if (ownLibs.length <= 1) score += 150 + libsAfter * 30;
            else if (ownLibs.length === 2) score += 50 + libsAfter * 10;
        }
    }
    this.board[r][c] = null;
    if (libsAfter <= 1 && captures === 0) score -= 1000; // 强制过滤送死
    let nearEnemy = false;
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 'me') {
                nearEnemy = true; break;
            }
        }
        if (nearEnemy) break;
    }
    if (nearEnemy && captures === 0) score += 25;
    score += Math.random() * 10;
    return score;
}

// 困难模式评分（从 getHardMove 提取）
hardScore(r, c, libsAfter, captures) {
    let score = captures * 300;
    this.board[r][c] = 'mj';
    const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] === 'me') {
            const enemyLibs = this.getLiberties(nr, nc);
            if (enemyLibs.length === 1) score += 300;
            else if (enemyLibs.length === 2) score += 120;
            else if (enemyLibs.length === 3) score += 30;
        }
    }
    for (const [nr, nc] of neighbors) {
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
        if (this.board[nr][nc] === 'mj') {
            const ownLibs = this.getLiberties(nr, nc);
            if (ownLibs.length <= 1) score += 200 + libsAfter * 40;
            else if (ownLibs.length === 2) score += 80 + libsAfter * 15;
        }
    }
    this.board[r][c] = null;
    if (libsAfter <= 1 && captures === 0) score -= 1000;
    let nearEnemyCount = 0;
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 'me') {
                nearEnemyCount++;
            }
        }
    }
    if (nearEnemyCount > 0 && captures === 0) score += 30 + nearEnemyCount * 5;
    score += Math.random() * 6;
    return score;
}

// 检测是否为劫（对方刚提走一子，且本手只能吃掉这一子）
isKoCapture(row, col, player) {
    if (this.moveHistory.length < 2) return false;
    const last = this.moveHistory[this.moveHistory.length - 1];
    const secondLast = this.moveHistory[this.moveHistory.length - 2];
    // 条件：上一步是对方落子，且我方这次落子位置与上一步相同（即提回）
    if (last.player !== player && last.row === row && last.col === col) {
        // 检查本次落子是否只能吃掉刚好1颗子（即提劫）
        const captures = this.getCaptureCount(row, col, player);
        return captures === 1;
    }
    return false;
}
// 检测是否为"反复提子"循环（最近两步在同一位置互相吃子）
isRepetitiveCapture(row, col) {
  const len = this.moveHistory.length;
  if (len < 2) return false;

  const last = this.moveHistory[len - 1]; // 上一步（你的落子）
  const prev = this.moveHistory[len - 2]; // 上上步（AI的落子）

  // 条件1：最近两步落子位置都在这个坐标
  if (last.row !== row || last.col !== col) return false;
  if (prev.row !== row || prev.col !== col) return false;

  // 条件2：双方各走一步（说明在这个位置互相“纠缠”）
  if (last.player === prev.player) return false;

  // ★ 不再要求双方都必须吃子，只要在同一位置反复落子就跳过
  return true;
}
// 检测是否是劫争位置（对方刚提走一颗子，不能立刻提回）
isKoPosition(row, col, player) {
  const len = this.moveHistory.length;
  if (len < 1) return false;

  const last = this.moveHistory[len - 1];

  // 条件1：上一步必须是对手落子
  if (last.player === player) return false;

  // 条件2：上一步的落子位置必须和当前相同（即提走了这个位置的子）
  if (last.row !== row || last.col !== col) return false;

  // 条件3：上一步吃掉且仅吃掉了一颗子
  const opponent = player === 'mj' ? 'me' : 'mj';
  const captureCount = this.getCaptureCountAtMove(last.row, last.col, opponent);
  if (captureCount !== 1) return false;

  // 条件4：上上步不是在这个位置落子（排除连续送死的情况）
  if (len >= 3) {
    const prev = this.moveHistory[len - 2];
    if (prev.row === row && prev.col === col && prev.player === player) return false;
  }

  return true;
}

// 计算某一步实际吃掉了多少颗棋子
getCaptureCountAtMove(row, col, player) {
  // 临时恢复棋盘到落子后的状态
  this.board[row][col] = player;
  let totalCaptured = 0;
  const neighbors = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]];
  for (const [nr, nc] of neighbors) {
    if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
    if (this.board[nr][nc] && this.board[nr][nc] !== player) {
      const libs = this.getLiberties(nr, nc);
      if (libs.length === 0) {
        totalCaptured += this.countGroup(nr, nc);
      }
    }
  }
  this.board[row][col] = null;
  return totalCaptured;
}
mjMove() {
  if (this.gameOver) return;

  // 根据难度获取候选落子列表
  let candidates = [];
  if (this.difficulty === 'easy') {
    candidates = this.getAllMoves();
    candidates.sort((a, b) => b.score - a.score);
  } else if (this.difficulty === 'medium') {
    candidates = this.getAllMovesWithScore('medium');
    candidates.sort((a, b) => b.score - a.score);
  } else {
    candidates = this.getAllMovesWithScore('hard');
    candidates.sort((a, b) => b.score - a.score);
  }

  // 按顺序尝试落子，遇到劫争位置就跳过
  for (const move of candidates) {
    if (!this.isValidMove(move.row, move.col, 'mj')) continue;
    if (this.isKoPosition(move.row, move.col, 'mj')) continue;

    this.placeStone(move.row, move.col, 'mj');
    // 偶尔发互动消息
    if (typeof gomokuCustomMessages !== 'undefined' && gomokuCustomMessages.length > 0 && Math.random() < 0.01) {
      const mjMsg = gomokuCustomMessages[Math.floor(Math.random() * gomokuCustomMessages.length)];
      setTimeout(() => this.showGoBubble('mj', mjMsg), 500 + Math.random() * 1000);
    }
    return;
  }

  // 所有候选都不可用，弃权
  this.passTurn();
}

getEasyMove() {
    const candidates = [];
    for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
            if (!this.isValidMove(r, c, 'mj')) continue;
            
            // 【强制过滤】送死点直接排除
            const libsAfter = this.getLibertiesAfterMove(r, c, 'mj');
            const captures = this.getCaptureCount(r, c, 'mj');
            if (libsAfter === 0 && captures === 0) continue;
            
            // 【加强过滤】只剩1气且吃不到子，也是送死
            if (libsAfter === 1 && captures === 0) continue;
            
            let score = 0;
            if (captures > 0) score += captures * 80;
            score += Math.random() * 15;
            candidates.push({ row: r, col: c, score });
        }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}

getMediumMove() {
    const candidates = [];
    for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
            if (!this.isValidMove(r, c, 'mj')) continue;
            
            // 【强制过滤】送死点直接排除
            const libsAfter = this.getLibertiesAfterMove(r, c, 'mj');
            const captures = this.getCaptureCount(r, c, 'mj');
            if (libsAfter === 0 && captures === 0) continue;

            let score = 0;
            if (this.mercyRequested && captures > 0 && Math.random() < 0.7) {
              continue;
            }

            // 吃子
            if (captures > 0) {
                score += captures * 200;
            }

            // 叫吃/收气
            this.board[r][c] = 'mj';
            const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
            for (const [nr, nc] of neighbors) {
                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (this.board[nr][nc] === 'me') {
                    const enemyLibs = this.getLiberties(nr, nc);
                    if (enemyLibs.length === 1) score += 200;
                    else if (enemyLibs.length === 2) score += 80;
                }
            }

            // 救子：自己只剩1-2口气时，往气多的地方跑
            for (const [nr, nc] of neighbors) {
                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (this.board[nr][nc] === 'mj') {
                    const ownLibs = this.getLiberties(nr, nc);
                    if (ownLibs.length <= 1) {
                        // 只剩1口气：必须跑，而且跑到气多的地方
                        score += 150 + libsAfter * 30;
                    } else if (ownLibs.length === 2) {
                        // 只剩2口气：优先延气
                        score += 50 + libsAfter * 10;
                    }
                }
            }
            this.board[r][c] = null;

            // 【强制过滤】如果救子分高但落子后只有1气且吃不到子，放弃这个点
            if (libsAfter <= 1 && captures === 0) continue;

            // 骚扰
            let nearEnemy = false;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 'me') {
                        nearEnemy = true;
                        break;
                    }
                }
                if (nearEnemy) break;
            }
            if (nearEnemy && captures === 0) score += 25;

            score += Math.random() * 10;
            candidates.push({ row: r, col: c, score });
        }
    }
    if (candidates.length === 0) return null;
    this.mercyRequested = false;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}

getHardMove() {
    const candidates = [];
    for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
            if (!this.isValidMove(r, c, 'mj')) continue;
            
            // 【强制过滤】送死点直接排除
            const libsAfter = this.getLibertiesAfterMove(r, c, 'mj');
            const captures = this.getCaptureCount(r, c, 'mj');
            if (libsAfter === 0 && captures === 0) continue;

            let score = 0;
            if (this.mercyRequested && captures > 0 && Math.random() < 0.7) {
              continue;
            }

            // 吃子
            if (captures > 0) {
                score += captures * 300;
            }

            // 叫吃/收气
            this.board[r][c] = 'mj';
            const neighbors = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
            for (const [nr, nc] of neighbors) {
                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (this.board[nr][nc] === 'me') {
                    const enemyLibs = this.getLiberties(nr, nc);
                    if (enemyLibs.length === 1) score += 300;
                    else if (enemyLibs.length === 2) score += 120;
                    else if (enemyLibs.length === 3) score += 30;
                }
            }

            // 救子：自己只剩1-2口气时，往气多的地方跑
            for (const [nr, nc] of neighbors) {
                if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) continue;
                if (this.board[nr][nc] === 'mj') {
                    const ownLibs = this.getLiberties(nr, nc);
                    if (ownLibs.length <= 1) {
                        // 只剩1口气：必须跑，而且跑到气多的地方
                        score += 200 + libsAfter * 40;
                    } else if (ownLibs.length === 2) {
                        // 只剩2口气：优先延气
                        score += 80 + libsAfter * 15;
                    }
                }
            }
            this.board[r][c] = null;

            // 【强制过滤】如果救子分高但落子后只有1气且吃不到子，放弃这个点
            if (libsAfter <= 1 && captures === 0) continue;

            // 骚扰
            let nearEnemyCount = 0;
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 'me') {
                        nearEnemyCount++;
                    }
                }
            }
            if (nearEnemyCount > 0 && captures === 0) score += 30 + nearEnemyCount * 5;

            score += Math.random() * 6;
            candidates.push({ row: r, col: c, score });
        }
    }


    if (candidates.length === 0) return null;
    this.mercyRequested = false;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}

    // 围棋专用气泡消息
showGoBubble(who, msg) {
    // 确保气泡层存在
    if (!this.bubbleLayer) {
        this.bubbleLayer = document.createElement('div');
        this.bubbleLayer.style.cssText = 'position:relative;width:100%;max-width:400px;margin:8px auto;min-height:30px;';
        this.container.appendChild(this.bubbleLayer);
    }
    const b = document.createElement('div');
    b.style.cssText = `max-width:70%;padding:6px 10px;border-radius:12px;font-size:13px;margin:4px 0;word-break:break-word;animation: fadeInOut 3s forwards;`;
    b.style.cssText += who === 'me' ? 'margin-left:auto;background:var(--bubble-sent);color:#fff;border-top-right-radius:2px;' : 'margin-right:auto;background:var(--bubble-recv);border:1px solid var(--bubble-recv-border);border-top-left-radius:2px;';
    b.textContent = msg;
    this.bubbleLayer.appendChild(b);
    setTimeout(() => { if (b.parentNode) b.remove(); }, 4000);
}

// 互动消息面板
showGoChatPanel() {
    const msgs = typeof gomokuCustomMessages !== 'undefined' && gomokuCustomMessages.length > 0
        ? [...gomokuCustomMessages]
        : ['你下得真好', '再来一局吧', '这步妙啊', '我要认真了', '有点意思', '加油'];
    
    const overlay = document.createElement('div'); overlay.className = 'mask show';
    const card = document.createElement('div'); card.className = 'pop-card'; card.style.width = '300px';
    const header = document.createElement('div'); header.className = 'pop-header'; header.textContent = '互动消息';
    const closeBtn = document.createElement('span'); closeBtn.className = 'close-pop'; closeBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('x')}</svg>`; closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn); card.appendChild(header);
    
    const body = document.createElement('div'); body.className = 'pop-body'; body.style.maxHeight = '300px'; body.style.overflowY = 'auto';
    
    // 消息列表
const renderMsgList = () => {
    // 清空body但保留标题区域
    const existingItems = body.querySelectorAll('.msg-row-item');
    existingItems.forEach(el => el.remove());
    
    const currentMsgs = typeof gomokuCustomMessages !== 'undefined' ? gomokuCustomMessages : msgs;
    currentMsgs.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = 'msg-row-item';
        row.style.cssText = 'display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);gap:8px;';
        
        // 消息文字（点击直接发送）
        const textSpan = document.createElement('span');
        textSpan.style.cssText = 'flex:1;font-size:14px;cursor:pointer;word-break:break-word;';
        textSpan.textContent = m;
        textSpan.onclick = () => {
            overlay.remove();
            this.showGoBubble('me', m);
        };
        row.appendChild(textSpan);
        
        // 编辑按钮（点击可编辑原词条）
        const editBtn = document.createElement('button');
        editBtn.className = 'btn';
        editBtn.style.cssText = 'font-size:16px;padding:2px 6px;flex-shrink:0;border:none;background:transparent;cursor:pointer;color:var(--theme);display:flex;align-items:center;';
        editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('edit-3')}</svg>`;
        editBtn.title = '编辑';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            // 把文字替换成输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.value = m;
            input.style.cssText = 'flex:1;padding:4px 8px;border-radius:8px;border:1px solid var(--theme);font-size:14px;';
            textSpan.replaceWith(input);
            input.focus();
            input.select();
            
            const saveEdit = () => {
                const newVal = input.value.trim();
                if (newVal && newVal !== m) {
                    gomokuCustomMessages[idx] = newVal;
                    try { localStorage.setItem('jxj_gomoku_msgs', JSON.stringify(gomokuCustomMessages)); } catch(e) {}
                }
                renderMsgList();
            };
            input.addEventListener('blur', saveEdit);
            input.addEventListener('keypress', (ev) => {
                if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
            });
        };
        row.appendChild(editBtn);
        
        // 删除按钮
        const delBtn = document.createElement('button');
        delBtn.className = 'btn';
        delBtn.style.cssText = 'font-size:16px;padding:2px 6px;flex-shrink:0;border:none;background:transparent;cursor:pointer;color:#f44336;display:flex;align-items:center;';
        delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">${getIconSVG('trash-2')}</svg>`;
        delBtn.title = '删除';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            gomokuCustomMessages.splice(idx, 1);
            try { localStorage.setItem('jxj_gomoku_msgs', JSON.stringify(gomokuCustomMessages)); } catch(e) {}
            renderMsgList();
        };
        row.appendChild(delBtn);
        
        body.appendChild(row);
    });
};

renderMsgList();
    card.appendChild(body);
    
    // 底部添加区域
    const inputRow = document.createElement('div');
    inputRow.style.cssText = 'display:flex;gap:6px;padding:8px;border-top:1px solid var(--border-light);';
    const input = document.createElement('input');
    input.placeholder = '添加新消息...';
    input.style.cssText = 'flex:1;padding:4px 8px;border-radius:8px;border:1px solid var(--border-light);font-size:13px;';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn-primary';
    addBtn.style.cssText = 'font-size:12px;padding:4px 10px;';
    addBtn.textContent = '添加';
    addBtn.onclick = () => {
        const v = input.value.trim();
        if (v) {
            if (typeof gomokuCustomMessages === 'undefined') gomokuCustomMessages = [];
            if (!gomokuCustomMessages.includes(v)) {
                gomokuCustomMessages.push(v);
                try { localStorage.setItem('jxj_gomoku_msgs', JSON.stringify(gomokuCustomMessages)); } catch(e) {}
            }
            input.value = '';
            renderMsgList();
        }
    };
    input.addEventListener('keypress', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); addBtn.click(); }
    });
    inputRow.appendChild(input); inputRow.appendChild(addBtn);
    card.appendChild(inputRow);
    
    overlay.appendChild(card); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
    requestUndo() {
      if (this.gameOver || this.currentPlayer !== 'me') { toast('现在不是你悔棋的时候'); return; }
      if (this.moveHistory.length < 1) { toast('无棋可悔'); return; }
      if (Math.random() < 0.5) {
        for (let i = 0; i < 2; i++) if (this.moveHistory.length) { const last = this.moveHistory.pop(); this.board[last.row][last.col] = null; }
        this.currentPlayer = 'me'; this.drawBoard(); this.updateScoreDisplay();
        this.statusDiv.textContent = '梦角同意悔棋，轮到你落子了'; toast('梦角同意悔棋');
      } else { toast('梦角不同意悔棋'); }
    }

    adjustCanvasSize() {
      const w = Math.min(this.container.clientWidth - 32, 360);
      if (w <= 0) return;
      this.canvas.width = w; this.canvas.height = w;
      this.cellSize = (w - this.padding * 2) / (this.size - 1);
      this.drawBoard();
    }

    resetBoard() {
      this.board = Array(this.size).fill().map(() => Array(this.size).fill(null));
      this.moveHistory = [];
      this.gameOver = false;
      this.passCount = 0;
      this.capturedByMe = 0;
      this.capturedByMJ = 0;
      this.lastMJMove = null;
      this.updateScoreDisplay();
      this.drawBoard();
    }

    reset() {
      this.resetBoard();
      setTimeout(() => { this.adjustCanvasSize(); this.showDifficultySelect(); }, 100);
    }

    drawBoard() {
      const ctx = this.canvas.getContext('2d'), w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#e8dcc8'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8b7355'; ctx.lineWidth = 0.5;
      for (let i = 0; i < this.size; i++) {
        const pos = this.padding + i * this.cellSize;
        ctx.beginPath(); ctx.moveTo(this.padding, pos); ctx.lineTo(w - this.padding, pos); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pos, this.padding); ctx.lineTo(pos, h - this.padding); ctx.stroke();
      }
      const starPoints = [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]];
      const dotR = this.cellSize * 0.08;
      ctx.fillStyle = '#6c7a89';
      starPoints.forEach(([r, c]) => {
        const x = this.padding + c * this.cellSize, y = this.padding + r * this.cellSize;
        ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2); ctx.fill();
      });
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.board[r][c]) {
            const x = this.padding + c * this.cellSize, y = this.padding + r * this.cellSize, rad = this.cellSize * 0.42;
            ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2);
            if (this.board[r][c] === 'me') { ctx.fillStyle = '#333'; ctx.fill(); }
            else { ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke(); }
          }
        }
      }
      if (this.lastMJMove) {
        const { row, col } = this.lastMJMove;
        if (this.board[row] && this.board[row][col] === 'mj') {
          const x = this.padding + col * this.cellSize, y = this.padding + row * this.cellSize, len = this.cellSize * 0.55;
          ctx.strokeStyle = 'rgba(212, 160, 23, 0.85)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len); ctx.lineTo(x, y + len); ctx.stroke();
        }
      }
    }
  }
}, 0);
// ---------- 五子棋游戏 ----------
let gomokuGame = null;
let gomokuCustomMessages = JSON.parse(localStorage.getItem('jxj_gomoku_msgs') || '["该你了", "快点呀", "下这里", "你好厉害", "再来一局"]');

function openGomokuPage(userId) {
  hideAllPages();
  document.getElementById('gomokuPage').classList.add('active');
  // 每次都创建新游戏，让玩家重新选择难度和颜色
  gomokuGame = new GomokuGame('gomokuPageContent', userId);
}

class GomokuGame {
    constructor(containerId, userId) {
        this.container = document.getElementById(containerId);
        this.userId = userId;
        this.size = 19;
        this.cellSize = 0;
        this.padding = 10;
        this.board = [];
        this.currentPlayer = 'me';
        this.gameOver = false;
        this.meColor = 'black';
        this.mjColor = 'white';
        this.moveHistory = [];
        this.timer = null;
        this.lastMoveTime = 0;
        this.forcedMove = false;
        this.lastMJMove = null;   // 记录 MJ 最近一次落子位置
        this.difficulty = 'medium'; // 默认中等难度
        this.thinkTime = 0;         // 当前思考已用时间
        this.maxThinkTime = 60;     // 最大思考时间（秒）
        this.graceTime = 10;        // 前10秒不计时
        this.countdownTimer = null; // 倒计时刷新
        this.initUI();
    }

    initUI() {
        this.container.innerHTML = '';
        
        const contact = getContact(this.userId);
        
        // 顶部信息栏（MJ）
        const topBar = document.createElement('div');
        topBar.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;width:100%;max-width:400px;margin:0 auto;';
        
        const mjAvatar = document.createElement('div');
        mjAvatar.className = 'gomoku-avatar';
        mjAvatar.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden;cursor:pointer;flex-shrink:0;';
        if(contact && contact.avt){
            mjAvatar.innerHTML = `<img src="${contact.avt}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            mjAvatar.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/></svg>`;
        }
        mjAvatar.title = '点击发送快捷消息';
        mjAvatar.onclick = () => this.showQuickMsg('mj');
        topBar.appendChild(mjAvatar);
        
        this.mjStoneIndicator = document.createElement('span');
        this.mjStoneIndicator.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;';
        topBar.appendChild(this.mjStoneIndicator);
        
        const mjName = document.createElement('span');
        mjName.style.cssText = 'font-weight:bold;color:var(--text-primary);font-size:14px;';
        mjName.textContent = contact ? contact.name : '梦角';
        topBar.appendChild(mjName);
        
        this.mjColorText = document.createElement('span');
        this.mjColorText.style.cssText = 'font-size:12px;color:var(--text-secondary);';
        topBar.appendChild(this.mjColorText);
        
        // 倒计时显示（放在 MJ 信息栏右侧）
        this.timerDisplay = document.createElement('span');
        this.timerDisplay.style.cssText = 'margin-left:auto;font-size:20px;font-weight:bold;color:var(--theme);min-width:50px;text-align:right;';
        this.timerDisplay.textContent = '';
        topBar.appendChild(this.timerDisplay);
        
        this.container.appendChild(topBar);
        
        // 棋盘区域
        const boardContainer = document.createElement('div');
        boardContainer.style.cssText = 'position:relative;display:flex;justify-content:center;width:100%;max-width:400px;margin:0 auto;';
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'gomokuCanvas';
        this.canvas.style.cssText = 'width:100%;max-width:360px;display:block;';
        boardContainer.appendChild(this.canvas);
        this.container.appendChild(boardContainer);
        
        // 底部信息栏（我）
        const bottomBar = document.createElement('div');
        bottomBar.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:8px 12px;width:100%;max-width:400px;margin:0 auto;';
        
        this.meColorText = document.createElement('span');
        this.meColorText.style.cssText = 'font-size:12px;color:var(--text-secondary);';
        bottomBar.appendChild(this.meColorText);
        
        const meName = document.createElement('span');
        meName.style.cssText = 'font-weight:bold;color:var(--text-primary);font-size:14px;';
        meName.textContent = appData.myProfile.name;
        bottomBar.appendChild(meName);
        
        this.meStoneIndicator = document.createElement('span');
        this.meStoneIndicator.style.cssText = 'width:20px;height:20px;border-radius:50%;flex-shrink:0;';
        bottomBar.appendChild(this.meStoneIndicator);
        
        const meAvatar = document.createElement('div');
        meAvatar.className = 'gomoku-avatar';
        meAvatar.style.cssText = 'width:40px;height:40px;border-radius:50%;overflow:hidden;cursor:pointer;flex-shrink:0;';
        if(appData.myProfile.avt){
            meAvatar.innerHTML = `<img src="${appData.myProfile.avt}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            meAvatar.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21c0-4.5 3-7 6.5-7s6.5 2.5 6.5 7"/></svg>`;
        }
        meAvatar.title = '点击发送快捷消息';
        meAvatar.onclick = () => this.showQuickMsg('me');
        bottomBar.appendChild(meAvatar);
        
        this.container.appendChild(bottomBar);
        
        // 状态和按钮
        this.statusDiv = document.createElement('div');
        this.statusDiv.className = 'gomoku-status';
        this.statusDiv.textContent = '请选择难度';
        this.container.appendChild(this.statusDiv);
        
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px;';
        
        this.undoBtn = document.createElement('button');
        this.undoBtn.className = 'gomoku-btn';
        this.undoBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('undo')}</svg> 悔棋`;
        this.undoBtn.onclick = () => this.requestUndo();
        btnRow.appendChild(this.undoBtn);
        
        this.urgeBtn = document.createElement('button');
        this.urgeBtn.className = 'gomoku-btn';
        this.urgeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('bell')}</svg> 催促`;
        this.urgeBtn.onclick = () => this.urgeOpponent();
        btnRow.appendChild(this.urgeBtn);
        
        this.msgBtn = document.createElement('button');
        this.msgBtn.className = 'gomoku-btn';
        this.msgBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('edit-3')}</svg> 消息`;
        this.msgBtn.onclick = () => this.manageMessages();
        btnRow.appendChild(this.msgBtn);
        
        this.resetBtn = document.createElement('button');
        this.resetBtn.className = 'gomoku-btn';
        this.resetBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${getIconSVG('refresh-cw')}</svg> 重来`;
        this.resetBtn.onclick = () => this.reset();
        btnRow.appendChild(this.resetBtn);
        
        this.container.appendChild(btnRow);
        
        this.bubbleLayer = document.createElement('div');
        this.bubbleLayer.style.cssText = 'position:relative;width:100%;max-width:400px;margin:8px auto;min-height:30px;';
        this.container.appendChild(this.bubbleLayer);
        
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        this.boundResize = () => this.adjustCanvasSize();
        window.addEventListener('resize', this.boundResize);
        
        this.resetBoard();
        
        setTimeout(() => {
            this.adjustCanvasSize();
            this.showDifficultySelect();
        }, 100);
    }

    // 难度选择弹窗
    showDifficultySelect() {
        const overlay = document.createElement('div');
        overlay.className = 'mask show';
        const card = document.createElement('div');
        card.className = 'pop-card';
        card.style.width = '280px';
        const header = document.createElement('div');
        header.className = 'pop-header';
        header.textContent = '选择难度';
        card.appendChild(header);
        const body = document.createElement('div');
        body.className = 'pop-body';
        body.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
        
        const modes = [
            { label: '简单', value: 'easy', desc: '梦角随机落子，适合放松' },
            { label: '中等', value: 'medium', desc: '梦角会防守，有一定挑战' },
            { label: '困难', value: 'hard', desc: '梦角主动进攻，很难赢' }
        ];
        
        modes.forEach(mode => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.cssText = 'width:100%;text-align:left;padding:10px;';
            btn.innerHTML = `<b>${mode.label}</b><br><span style="font-size:11px;color:var(--text-secondary);">${mode.desc}</span>`;
            btn.onclick = () => {
                overlay.remove();
                this.difficulty = mode.value;
                this.showColorSelect();
            };
            body.appendChild(btn);
        });
        
        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    }

    updateStoneIndicators() {
        if (this.meColor === 'black') {
            this.meStoneIndicator.style.background = '#333';
            this.meStoneIndicator.style.border = 'none';
        } else {
            this.meStoneIndicator.style.background = '#fff';
            this.meStoneIndicator.style.border = '2px solid #333';
        }
        this.meColorText.textContent = this.meColor === 'black' ? '黑棋' : '白棋';
        
        if (this.mjColor === 'black') {
            this.mjStoneIndicator.style.background = '#333';
            this.mjStoneIndicator.style.border = 'none';
        } else {
            this.mjStoneIndicator.style.background = '#fff';
            this.mjStoneIndicator.style.border = '2px solid #333';
        }
        this.mjColorText.textContent = this.mjColor === 'black' ? '黑棋' : '白棋';
    }

    showColorSelect() {
        const overlay = document.createElement('div');
        overlay.className = 'mask show';
        const card = document.createElement('div');
        card.className = 'pop-card';
        card.style.width = '280px';
        const header = document.createElement('div');
        header.className = 'pop-header';
        header.textContent = '选择棋子颜色';
        card.appendChild(header);
        const body = document.createElement('div');
        body.className = 'pop-body';
        body.style.cssText = 'display:flex;gap:10px;justify-content:center;';
        const blackBtn = document.createElement('button');
        blackBtn.className = 'btn-primary';
        blackBtn.textContent = '黑棋（先手）';
        blackBtn.onclick = () => {
            overlay.remove();
            this.meColor = 'black';
            this.mjColor = 'white';
            this.currentPlayer = 'me';
            this.updateStoneIndicators();
            this.adjustCanvasSize();
            this.startGame();
        };
        const whiteBtn = document.createElement('button');
        whiteBtn.className = 'btn';
        whiteBtn.textContent = '白棋（后手）';
        whiteBtn.onclick = () => {
            overlay.remove();
            this.meColor = 'white';
            this.mjColor = 'black';
            this.currentPlayer = 'mj';
            this.updateStoneIndicators();
            this.adjustCanvasSize();
            this.startGame();
        };
        body.appendChild(blackBtn);
        body.appendChild(whiteBtn);
        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    }

    startGame() {
        const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
        this.statusDiv.textContent = `${diffLabels[this.difficulty]} · ` + (this.currentPlayer === 'me' ? '轮到你落子了' : '梦角思考中...');
        this.lastMoveTime = Date.now();
        this.thinkTime = 0;
        this.updateTimerDisplay();
        this.startTimer();
        if (this.currentPlayer === 'mj') {
            setTimeout(() => this.mjMove(), this.getMJDelay());
        }
    }

    // 根据难度获取梦角思考延迟（秒）
    getMJDelay() {
        const min = this.difficulty === 'easy' ? 1 : (this.difficulty === 'medium' ? 2 : 3);
        const max = this.difficulty === 'easy' ? 3 : (this.difficulty === 'medium' ? 5 : 10);
        return (min + Math.random() * (max - min)) * 1000;
    }

    // 获取最大思考时间
    getMaxThinkTime() {
        return this.difficulty === 'easy' ? 45 : (this.difficulty === 'medium' ? 60 : 90);
    }

    startTimer() {
        clearInterval(this.timer);
        clearInterval(this.countdownTimer);
        this.lastMoveTime = Date.now();
        this.thinkTime = 0;
        this.forcedMove = false;
        this.maxThinkTime = this.getMaxThinkTime();
        this.updateTimerDisplay();
        
        this.countdownTimer = setInterval(() => {
            this.thinkTime = Math.floor((Date.now() - this.lastMoveTime) / 1000);
            this.updateTimerDisplay();
            
            // 超过10秒开始显示倒计时
            if (this.thinkTime > this.graceTime && this.thinkTime <= this.maxThinkTime) {
                const remaining = this.maxThinkTime - this.thinkTime;
                this.timerDisplay.textContent = `${remaining}s`;
                if (remaining <= 10) {
                    this.timerDisplay.style.color = '#f44336';
                } else {
                    this.timerDisplay.style.color = 'var(--theme)';
                }
            } else if (this.thinkTime <= this.graceTime) {
                this.timerDisplay.textContent = '';
            }
            
            // MJ 自动催促
            if (this.thinkTime > 30 && !this.forcedMove && this.currentPlayer === 'me') {
                if (Math.random() < 0.4) {
                    const msg = gomokuCustomMessages[Math.floor(Math.random() * gomokuCustomMessages.length)];
                    this.showBubble('mj', msg);
                }
            }
            
            // 超过最大时间，强制落子
            if (this.thinkTime >= this.maxThinkTime) {
                this.forcedMove = true;
                this.timerDisplay.textContent = '超时!';
                if (this.currentPlayer === 'me') {
                    this.randomMove('me');
                } else {
                    this.randomMove('mj');
                }
            }
        }, 500);
    }

    updateTimerDisplay() {
        if (this.thinkTime <= this.graceTime) {
            this.timerDisplay.textContent = '';
        }
    }

    randomMove(player) {
        if (this.gameOver) return;
        const empty = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (!this.board[r][c]) empty.push({row: r, col: c});
            }
        }
        if (empty.length > 0) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            this.placeStone(move.row, move.col, player);
        }
    }

    placeStone(row, col, player) {
      this.board[row][col] = player;
    
      // 记录 MJ 刚下的位置（用于在棋盘上画十字标记）
      if (player === 'mj') {
        this.lastMJMove = { row, col };
      } else {
        this.lastMJMove = null;
      }
    
      this.moveHistory.push({ row, col, player });
      this.drawBoard();
      clearInterval(this.timer);
      clearInterval(this.countdownTimer);
      this.timerDisplay.textContent = '';
      this.forcedMove = false;
      if (this.checkWin(row, col, player)) {
        this.gameOver = true;
        const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
        this.statusDiv.textContent = `${diffLabels[this.difficulty]} · ` + (player === 'me' ? '🎉 你赢了！' : '梦角赢了');
        return;
      }
      if (this.isBoardFull()) {
        this.gameOver = true;
        this.statusDiv.textContent = '平局';
        return;
      }
      this.switchPlayer();
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'me' ? 'mj' : 'me';
        const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
        if (this.currentPlayer === 'me') {
            this.statusDiv.textContent = `${diffLabels[this.difficulty]} · 轮到你落子了`;
            this.startTimer();
        } else {
            this.statusDiv.textContent = `${diffLabels[this.difficulty]} · 梦角思考中...`;
            this.startTimer();
            setTimeout(() => this.mjMove(), this.getMJDelay());
        }
    }

    handleClick(e) {
        if (this.gameOver || this.currentPlayer !== 'me') return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const col = Math.round((x - this.padding) / this.cellSize);
        const row = Math.round((y - this.padding) / this.cellSize);
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) return;
        if (this.board[row][col] !== null) return;
        this.placeStone(row, col, 'me');
    }

    mjMove() {
        if (this.gameOver) return;
        let move;
        if (this.difficulty === 'easy') {
            move = this.getEasyMove();
        } else if (this.difficulty === 'medium') {
            move = this.getMediumMove();
        } else {
            move = this.getHardMove();
        }
        if (move) {
            this.placeStone(move.row, move.col, 'mj');
        } else {
            this.randomMove('mj');
        }
    }

    // 简单：随机落子
    getEasyMove() {
        const empty = [];
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (!this.board[r][c]) empty.push({row: r, col: c});
            }
        }
        if (empty.length === 0) return null;
        return empty[Math.floor(Math.random() * empty.length)];
    }

    getMediumMove() {
    // ★ 最高优先级：检查自己能否直接连五获胜
    const winMove = this.findWinningMove('mj');
    if (winMove) return winMove;
    
    // 检查是否需要堵对方的五连
    const blockMove = this.findWinningMove('me');
    if (blockMove) return blockMove;
    
    // 堵对方的三连或四连
    const threatMove = this.findThreatMove('me');
    if (threatMove) return threatMove;
    
    // 没威胁时主动进攻
    const size = this.size;
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    
    const maxPotential = (row, col, dx, dy) => {
        let count = 1;
        for (let s = 1; s < 5; s++) {
            const r = row + s * dx, c = col + s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - s * dx, c = col - s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        return count;
    };
    
    const countInDir = (row, col, dx, dy, p) => {
        let cnt = 0;
        for (let s = 1; s < 5; s++) {
            const r = row + s * dx, c = col + s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size && this.board[r][c] === p) cnt++; else break;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - s * dx, c = col - s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size && this.board[r][c] === p) cnt++; else break;
        }
        return cnt;
    };
    
    let bestScore = -1, bestMove = null;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (this.board[r][c] !== null) continue;
            let score = 0;
            for (const [dx, dy] of directions) {
                if (maxPotential(r, c, dx, dy) < 5) continue;
                const cnt = countInDir(r, c, dx, dy, 'mj');
                if (cnt >= 4) score += 100000;
                else if (cnt === 3) score += 3000;
                else if (cnt === 2) score += 150;
                else if (cnt === 1) score += 15;
            }
            const center = Math.floor(size / 2);
            score += (center - Math.abs(r - center) - Math.abs(c - center)) * 2;
            score += Math.random() * 30;
            if (score > bestScore) { bestScore = score; bestMove = { row: r, col: c }; }
        }
    }
    return bestMove || this.getEasyMove();
}
    // 困难：主动进攻 + 防守
    getHardMove() {
        return this.getAIMove();
    }

    // 查找威胁（三连或四连）
    findThreatMove(player) {
    const size = this.size;
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    
    // 计算某个方向最多能连几个子（受边界限制）
    const maxPotential = (row, col, dx, dy) => {
        let count = 1;
        for (let s = 1; s < 5; s++) {
            const r = row + s * dx, c = col + s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - s * dx, c = col - s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        return count;
    };
    
    let bestMove = null;
    let bestScore = 0;
    
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (this.board[r][c] !== null) continue;
            
            let score = 0;
            for (const [dx, dy] of directions) {
                // 死线过滤：这个方向根本连不成五子，完全跳过
                if (maxPotential(r, c, dx, dy) < 5) continue;
                
                let count = 1;
                for (let step = 1; step < 5; step++) {
                    const nr = r + step * dx, nc = c + step * dy;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && this.board[nr][nc] === player) count++;
                    else break;
                }
                for (let step = 1; step < 5; step++) {
                    const nr = r - step * dx, nc = c - step * dy;
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && this.board[nr][nc] === player) count++;
                    else break;
                }
                if (count >= 3) score += count * count;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestMove = {row: r, col: c};
            }
        }
    }
    return bestMove;
}

    getAIMove() {
    const size = this.size;
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    
    // ★ 最高优先级：检查自己能否直接连五获胜
    const winMove = this.findWinningMove('mj');
    if (winMove) return winMove;
    
    // 计算某个方向最多能连几个子（受边界限制）
    const maxPotential = (row, col, dx, dy) => {
        let count = 1;
        for (let s = 1; s < 5; s++) {
            const r = row + s * dx, c = col + s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - s * dx, c = col - s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size) count++; else break;
        }
        return count;
    };
    
    const countInDir = (row, col, dx, dy, player) => {
        let count = 0;
        for (let s = 1; s < 5; s++) {
            const r = row + s * dx, c = col + s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size && this.board[r][c] === player) count++; else break;
        }
        for (let s = 1; s < 5; s++) {
            const r = row - s * dx, c = col - s * dy;
            if (r >= 0 && r < size && c >= 0 && c < size && this.board[r][c] === player) count++; else break;
        }
        return count;
    };
    
    // ★ 第二优先级：检查对方是否已经四连，必须立刻堵
    const blockWin = this.findWinningMove('me');
    if (blockWin) return blockWin;
    
    const scoreMove = (row, col) => {
        let attackScore = 0;
        let defenseScore = 0;
        let threatDirections = 0;
        let ownDirections = 0;
        
        for (const [dx, dy] of directions) {
            if (maxPotential(row, col, dx, dy) < 5) continue;
            
            const mjCount = countInDir(row, col, dx, dy, 'mj');
            const meCount = countInDir(row, col, dx, dy, 'me');
            
            // 进攻分
            if (mjCount >= 4) attackScore += 100000;
            else if (mjCount === 3) { attackScore += 5000; ownDirections++; }
            else if (mjCount === 2) { attackScore += 200; ownDirections++; }
            else if (mjCount === 1) { attackScore += 20; }
            
            // 防守分
            if (meCount >= 4) defenseScore += 100000;
            else if (meCount === 3) { defenseScore += 5000; threatDirections++; }
            else if (meCount === 2) { defenseScore += 200; threatDirections++; }
            else if (meCount === 1) { defenseScore += 20; }
        }
        
        const layoutBonus = (ownDirections + threatDirections) * 300;
        const center = Math.floor(size / 2);
        const centerDist = Math.abs(row - center) + Math.abs(col - center);
        const centerBonus = (center - centerDist) * 3;
        
        return attackScore + defenseScore + layoutBonus + centerBonus + Math.random() * 50;
    };
    
    const candidates = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (this.board[r][c] === null) {
                candidates.push({ row: r, col: c, score: scoreMove(r, c) });
            }
        }
    }
    
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
}
    findWinningMove(player) {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === null) {
                    this.board[r][c] = player;
                    if (this.checkWin(r, c, player)) {
                        this.board[r][c] = null;
                        return {row: r, col: c};
                    }
                    this.board[r][c] = null;
                }
            }
        }
        return null;
    }

    requestUndo() {
        if (this.gameOver) return;
        if (this.currentPlayer !== 'me') {
            toast('现在不是你悔棋的时候');
            return;
        }
        if (this.moveHistory.length < 1) {
            toast('无棋可悔');
            return;
        }
        const agree = Math.random() < 0.5;
        if (agree) {
            for (let i = 0; i < 2; i++) {
                if (this.moveHistory.length > 0) {
                    const last = this.moveHistory.pop();
                    this.board[last.row][last.col] = null;
                }
            }
            this.drawBoard();
            this.currentPlayer = 'me';
            const diffLabels = { easy: '简单', medium: '中等', hard: '困难' };
            this.statusDiv.textContent = `${diffLabels[this.difficulty]} · 梦角同意悔棋，轮到你落子了`;
            this.startTimer();
            toast('梦角同意悔棋');
        } else {
            toast('梦角不同意悔棋');
            this.showBubble('mj', '我不想悔棋');
        }
    }

    urgeOpponent() {
        if (this.gameOver) return;
        if (this.currentPlayer !== 'mj') {
            toast('现在是你自己的回合');
            return;
        }
        const msg = gomokuCustomMessages[Math.floor(Math.random() * gomokuCustomMessages.length)];
        this.showBubble('me', msg);
        toast('已催促');
    }

    showQuickMsg(who) {
        const msgs = gomokuCustomMessages;
        const overlay = document.createElement('div');
        overlay.className = 'mask show';
        const card = document.createElement('div');
        card.className = 'pop-card';
        card.style.width = '250px';
        const header = document.createElement('div');
        header.className = 'pop-header';
        header.textContent = '快捷消息';
        card.appendChild(header);
        const body = document.createElement('div');
        body.className = 'pop-body';
        body.style.maxHeight = '200px';
        body.style.overflowY = 'auto';
        msgs.forEach(msg => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.cssText = 'width:100%;text-align:left;margin-bottom:4px;';
            btn.textContent = msg;
            btn.onclick = () => {
                overlay.remove();
                this.showBubble(who, msg);
            };
            body.appendChild(btn);
        });
        card.appendChild(body);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    }

    showBubble(who, msg) {
        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width:70%;padding:6px 10px;border-radius:12px;font-size:13px;margin:4px 0;word-break:break-word;animation: fadeInOut 3s forwards;`;
        if (who === 'me') {
            bubble.style.cssText += 'margin-left:auto;background:var(--bubble-sent);color:#fff;border-top-right-radius:2px;';
        } else {
            bubble.style.cssText += 'margin-right:auto;background:var(--bubble-recv);border:1px solid var(--bubble-recv-border);border-top-left-radius:2px;';
        }
        bubble.textContent = msg;
        this.bubbleLayer.appendChild(bubble);
        setTimeout(() => { if(bubble.parentNode) bubble.remove(); }, 3000);
    }

    manageMessages() {
        const overlay = document.createElement('div');
        overlay.className = 'mask show';
        const card = document.createElement('div');
        card.className = 'pop-card';
        card.style.width = '300px';
        const header = document.createElement('div');
        header.className = 'pop-header';
        header.textContent = '管理快捷消息';
        card.appendChild(header);
        const body = document.createElement('div');
        body.className = 'pop-body';
        body.style.maxHeight = '300px';
        body.style.overflowY = 'auto';
        
        const inputRow = document.createElement('div');
        inputRow.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;';
        const input = document.createElement('input');
        input.placeholder = '添加新消息';
        input.style.cssText = 'flex:1;padding:4px 8px;border-radius:8px;border:1px solid var(--border-light);';
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-primary';
        addBtn.textContent = '添加';
        addBtn.onclick = () => {
            const val = input.value.trim();
            if (val && !gomokuCustomMessages.includes(val)) {
                gomokuCustomMessages.push(val);
                localStorage.setItem('jxj_gomoku_msgs', JSON.stringify(gomokuCustomMessages));
                overlay.remove();
                this.manageMessages();
            }
        };
        inputRow.appendChild(input);
        inputRow.appendChild(addBtn);
        body.appendChild(inputRow);
        
        gomokuCustomMessages.forEach((msg, idx) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border-light);';
            row.textContent = msg;
            const delBtn = document.createElement('button');
            delBtn.className = 'btn';
            delBtn.style.cssText = 'color:#f44336;font-size:12px;';
            delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2">${getIconSVG('trash-2')}</svg>`;
            delBtn.onclick = () => {
                gomokuCustomMessages.splice(idx, 1);
                localStorage.setItem('jxj_gomoku_msgs', JSON.stringify(gomokuCustomMessages));
                overlay.remove();
                this.manageMessages();
            };
            row.appendChild(delBtn);
            body.appendChild(row);
        });
        card.appendChild(body);
        const footer = document.createElement('div');
        footer.className = 'pop-footer';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn';
        closeBtn.textContent = '关闭';
        closeBtn.onclick = () => overlay.remove();
        footer.appendChild(closeBtn);
        card.appendChild(footer);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
    }

    adjustCanvasSize() {
        const containerWidth = this.container.clientWidth - 32;
        const maxWidth = 360;
        const width = Math.min(containerWidth, maxWidth);
        if (width <= 0) return;
        this.canvas.width = width;
        this.canvas.height = width;
        this.cellSize = (width - this.padding * 2) / (this.size - 1);
        this.drawBoard();
    }

   resetBoard() {
      this.board = Array(this.size).fill().map(() => Array(this.size).fill(null));
      this.moveHistory = [];
      this.gameOver = false;
      this.lastMJMove = null; // 清除 MJ 最后落子标记
      clearInterval(this.timer);
      clearInterval(this.countdownTimer);
      this.timerDisplay.textContent = '';
      this.drawBoard();
    }
    
    reset() {
      this.resetBoard();
      setTimeout(() => {
        this.adjustCanvasSize();
        this.showDifficultySelect();
      }, 100);
    }

    drawBoard() {
      const ctx = this.canvas.getContext('2d');
      const w = this.canvas.width;
      const h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#e8dcc8';
      ctx.fillRect(0, 0, w, h);
    
      // 网格线
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < this.size; i++) {
        const pos = this.padding + i * this.cellSize;
        ctx.beginPath();
        ctx.moveTo(this.padding, pos);
        ctx.lineTo(w - this.padding, pos);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos, this.padding);
        ctx.lineTo(pos, h - this.padding);
        ctx.stroke();
      }
    
      // 星位点
      const starPoints = [
            [3, 3], [3, 9], [3, 15],
            [9, 3], [9, 9], [9, 15],
            [15, 3], [15, 9], [15, 15]
        ];
      const dotRadius = this.cellSize * 0.08;
      ctx.fillStyle = '#6c7a89';
      starPoints.forEach(([r, c]) => {
        const x = this.padding + c * this.cellSize;
        const y = this.padding + r * this.cellSize;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    
      // 棋子
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.board[r][c]) {
            const x = this.padding + c * this.cellSize;
            const y = this.padding + r * this.cellSize;
            const radius = this.cellSize * 0.38;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            if (this.board[r][c] === 'me') {
              if (this.meColor === 'black') {
                ctx.fillStyle = '#333';
                ctx.fill();
              } else {
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            } else {
              if (this.mjColor === 'black') {
                ctx.fillStyle = '#333';
                ctx.fill();
              } else {
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            }
          }
        }
      }
    
      // 标记 MJ 刚下的棋子（十字准星）
      if (this.lastMJMove) {
        const { row, col } = this.lastMJMove;
        if (this.board[row] && this.board[row][col] === 'mj') {
          const x = this.padding + col * this.cellSize;
          const y = this.padding + row * this.cellSize;
          const len = this.cellSize * 0.55; // 十字线长度
          ctx.strokeStyle = 'rgba(212, 160, 23, 0.85)'; // 暖金色，半透明
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x - len, y);
          ctx.lineTo(x + len, y);
          ctx.moveTo(x, y - len);
          ctx.lineTo(x, y + len);
          ctx.stroke();
        }
      }
    }

    checkWin(row, col, player) {
        const directions = [[0,1],[1,0],[1,1],[1,-1]];
        for (const [dx, dy] of directions) {
            let count = 1;
            for (let step = 1; step < 5; step++) {
                const r = row + step * dx;
                const c = col + step * dy;
                if (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === player) count++;
                else break;
            }
            for (let step = 1; step < 5; step++) {
                const r = row - step * dx;
                const c = col - step * dy;
                if (r >= 0 && r < this.size && c >= 0 && c < this.size && this.board[r][c] === player) count++;
                else break;
            }
            if (count >= 5) return true;
        }
        return false;
    }

    isBoardFull() {
        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                if (this.board[r][c] === null) return false;
            }
        }
        return true;
    }
}