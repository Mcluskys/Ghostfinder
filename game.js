(() => {
  "use strict";

  const board = document.getElementById("board");
  const movesEl = document.getElementById("moves");
  const pairsEl = document.getElementById("pairs");
  const pairTotalEl = document.getElementById("pairTotal");
  const timeEl = document.getElementById("time");
  const messageEl = document.getElementById("message");
  const difficultyEl = document.getElementById("difficulty");
  const restartBtn = document.getElementById("restartBtn");
  const playAgainBtn = document.getElementById("playAgainBtn");
  const winPanel = document.getElementById("winPanel");
  const winText = document.getElementById("winText");

  const ghosts = ["👻","👽","💀","🎃","🦇","😈","🕷️","🧟","🧙","🕸️"];
  const levels = { easy: 6, medium: 8, hard: 10 };

  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let moves = 0;
  let matchedPairs = 0;
  let pairTotal = 8;
  let startedAt = null;
  let timerId = null;

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function startTimer() {
    if (startedAt !== null) return;
    startedAt = Date.now();
    timerId = window.setInterval(updateTimer, 1000);
    updateTimer();
  }

  function updateTimer() {
    if (startedAt === null) return;
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    timeEl.textContent = formatTime(elapsed);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    updateTimer();
  }

  function resetTurn() {
    firstCard = null;
    secondCard = null;
    lockBoard = false;
  }

  function flipCard(card) {
    if (lockBoard || card === firstCard || card.classList.contains("matched")) return;

    startTimer();
    card.classList.add("flipped");
    card.setAttribute("aria-pressed", "true");

    if (!firstCard) {
      firstCard = card;
      messageEl.textContent = "Trouve maintenant son fantôme jumeau.";
      return;
    }

    secondCard = card;
    moves += 1;
    movesEl.textContent = moves;

    const isMatch = firstCard.dataset.ghost === secondCard.dataset.ghost;

    if (isMatch) {
      firstCard.classList.add("matched");
      secondCard.classList.add("matched");
      matchedPairs += 1;
      pairsEl.textContent = matchedPairs;
      messageEl.textContent = "Bien joué ! Une paire retrouvée 👻";
      resetTurn();

      if (matchedPairs === pairTotal) {
        stopTimer();
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        winText.textContent = `Tu as retrouvé les ${pairTotal} paires en ${moves} coups et ${formatTime(seconds)}.`;
        winPanel.hidden = false;
        messageEl.textContent = "Toutes les paires ont été retrouvées !";
        winPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }

    lockBoard = true;
    messageEl.textContent = "Pas la même paire… mémorise-les bien !";

    window.setTimeout(() => {
      firstCard.classList.remove("flipped");
      secondCard.classList.remove("flipped");
      firstCard.setAttribute("aria-pressed", "false");
      secondCard.setAttribute("aria-pressed", "false");
      resetTurn();
      messageEl.textContent = "À toi de jouer.";
    }, 850);
  }

  function makeCard(ghost, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.ghost = ghost;
    button.setAttribute("aria-label", `Carte ${index + 1}, face cachée`);
    button.setAttribute("aria-pressed", "false");

    const inner = document.createElement("span");
    inner.className = "card-inner";

    const back = document.createElement("span");
    back.className = "card-face card-back";
    back.setAttribute("aria-hidden", "true");

    const front = document.createElement("span");
    front.className = "card-face card-front";
    front.innerHTML = `<span class="ghost" aria-hidden="true">${ghost}</span>`;

    inner.append(back, front);
    button.append(inner);
    button.addEventListener("click", () => flipCard(button));
    return button;
  }

  function newGame() {
    stopTimer();
    startedAt = null;
    timeEl.textContent = "00:00";
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    moves = 0;
    matchedPairs = 0;
    winPanel.hidden = true;

    pairTotal = levels[difficultyEl.value] || levels.medium;
    movesEl.textContent = "0";
    pairsEl.textContent = "0";
    pairTotalEl.textContent = pairTotal;
    board.dataset.pairs = pairTotal;

    const totalCards = pairTotal * 2;
    let cols = 4;
    if (window.innerWidth >= 760 && pairTotal === 10) cols = 5;
    const rows = Math.ceil(totalCards / cols);
    board.style.setProperty("--cols", cols);
    board.style.setProperty("--rows", rows);

    messageEl.textContent = "Clique ou touche une carte pour commencer.";

    const deck = shuffle([...ghosts.slice(0, pairTotal), ...ghosts.slice(0, pairTotal)]);
    board.replaceChildren(...deck.map(makeCard));
  }

  function updateBoardLayout() {
    const totalCards = pairTotal * 2;
    let cols = 4;
    if (window.innerWidth >= 760 && pairTotal === 10) cols = 5;
    const rows = Math.ceil(totalCards / cols);
    board.style.setProperty("--cols", cols);
    board.style.setProperty("--rows", rows);
  }

  window.addEventListener("resize", updateBoardLayout);

  difficultyEl.addEventListener("change", newGame);
  restartBtn.addEventListener("click", newGame);
  playAgainBtn.addEventListener("click", newGame);

  newGame();
})();
