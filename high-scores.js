/* =========================================
   KOOL RIFFS - THE HIGH SCORE TABLE
   =========================================
   Rob, 2026-11-01: "Think of old video games like Pac-Man. Or sometimes if
   you're a high score, you get a chance to put in your moniker. You can put
   something in. Only when you get a high score. And you can show it.
   Otherwise, it's player one."

   So the only thing a student ever types in Kool Riffs is a moniker of up to
   three letters or numbers, and only when a score makes the table. Arcade
   style: three characters is enough to be "you" and too few to be a name.
   Nothing typed: the moniker is the player's slot ("P1").

   One table per board (a game's stage and mode, e.g. 'real.lines.speed'),
   the top KR_HIGH_SIZE on this device, every player together, as an arcade
   cabinet would. Stored as { [board]: [{ score, tag, at }] }.
   ========================================= */

const KR_HIGH_KEY = 'koolRiffsHighScores';
const KR_HIGH_SIZE = 5;          // rows on a table
const KR_HIGH_TAG_LEN = 3;       // characters in a moniker

const KRHigh = {
    readAll() {
        let all = null;
        try { all = JSON.parse(localStorage.getItem(KR_HIGH_KEY)); } catch (e) {}
        return (all && typeof all === 'object') ? all : {};
    },

    table(board) {
        const rows = this.readAll()[board];
        return Array.isArray(rows) ? rows.slice(0, KR_HIGH_SIZE) : [];
    },

    // Only a real score makes the table: zero never does.
    qualifies(board, score) {
        const rows = this.table(board);
        if (!(score > 0)) return false;
        return rows.length < KR_HIGH_SIZE || score > rows[rows.length - 1].score;
    },

    // Letters and numbers only, capitals, at most three.
    cleanTag(text) {
        return String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, KR_HIGH_TAG_LEN);
    },

    // The moniker when nothing is typed: the player's slot, "P1".
    defaultTag() {
        const player = typeof vsmashCurrentPlayer === 'function' ? vsmashCurrentPlayer() : null;
        return KR.t('high.slotTag', { n: player ? player.slot : 1 });
    },

    // Adds a row and returns where it landed (0 is the top), or -1.
    add(board, score, tag) {
        const all = this.readAll();
        const rows = Array.isArray(all[board]) ? all[board] : [];
        const row = { score: Math.round(score), tag: this.cleanTag(tag) || this.defaultTag(), at: Date.now() };
        rows.push(row);
        // Higher first; an equal score goes under the one already there.
        rows.sort((a, b) => b.score - a.score || a.at - b.at);
        all[board] = rows.slice(0, KR_HIGH_SIZE);
        try { localStorage.setItem(KR_HIGH_KEY, JSON.stringify(all)); } catch (e) {}
        return all[board].indexOf(row);
    },

    make(tag, className, parent) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (parent) parent.appendChild(el);
        return el;
    },

    // The table, the new row lit.
    render(box, board, lit) {
        box.innerHTML = '';
        const rows = this.table(board);
        if (!rows.length) { box.hidden = true; return; }
        box.hidden = false;
        this.make('div', 'kr-high-title', box).textContent = KR.t('high.title');
        const list = this.make('ol', 'kr-high-list', box);
        rows.forEach((row, i) => {
            const item = this.make('li', 'kr-high-row' + (i === lit ? ' lit' : ''), list);
            this.make('span', 'kr-high-rank', item).textContent = String(i + 1);
            this.make('span', 'kr-high-tag', item).textContent = row.tag;
            this.make('span', 'kr-high-score', item).textContent = String(row.score);
        });
    },

    /* At the end of a round. If the score makes the table, ask for the
       moniker first, then show the table with it lit; if not, just show the
       table. The box is emptied either way. */
    offer(box, board, score) {
        if (!box) return;
        if (!this.qualifies(board, score)) return this.render(box, board, -1);
        box.innerHTML = '';
        box.hidden = false;
        this.make('div', 'kr-high-title', box).textContent = KR.t('high.new');
        this.make('p', 'kr-high-ask', box).textContent = KR.t('high.ask');
        const form = this.make('div', 'kr-high-form', box);
        const input = this.make('input', 'kr-high-input', form);
        input.type = 'text';
        input.maxLength = KR_HIGH_TAG_LEN;
        input.autocomplete = 'off';
        input.setAttribute('autocapitalize', 'characters');
        input.setAttribute('spellcheck', 'false');
        input.placeholder = this.defaultTag();
        input.oninput = () => { const clean = this.cleanTag(input.value); if (clean !== input.value) input.value = clean; };
        const go = this.make('button', 'btn btn-start kr-high-go', form);
        go.type = 'button';
        go.textContent = KR.t('high.enter');
        let done = false;
        const save = () => {
            if (done) return;
            done = true;
            const lit = this.add(board, score, input.value);
            this.render(box, board, lit);
        };
        go.onclick = save;
        input.onkeydown = (e) => { if (e.key === 'Enter') save(); };
    },
};
