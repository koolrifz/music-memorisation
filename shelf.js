/* =========================================
   KOOL RIFFS - THE SHELF (shared level picker)
   =========================================
   Every game picks its level the same way: a crate of ALBUMS, and the open
   album's TRACKS below it. Records are the studio's props; a student sees
   "pick an album, pick a track", which is a menu they already know.

     KR.shelf.render(host, {
         albums:   [{ id, titleId, levelIds: ['1','2',...] }],
         levelName: (levelId) => 'words',      // from lang/, never the code
         unlocked: Set of levelIds the student may play,
         records:  { levelId: { cleared, bestScore } },
         current:  levelId now selected,
         onPick:   (levelId) => ...            // a track was chosen
     });

   Rules (Rob, 2026-10-13):
     - THE RECORD LADDER (Rob, 2026-10-13): a track is a black record; CLEARED it
       turns GOLD. Gold is earned, never default. (Platinum = a whole pillar,
       diamond = every pillar: not built, see CLAUDE.md "THE RECORD LADDER".)
     - An album here is only a handful of tracks; when all are gold it is marked
       complete, not given a metal of its own.
     - An album nothing in it is open yet is dimmed, with the "not yet" line.
     - Locked tracks still show their name, dimmed (a student can see what is coming).
     - With the teacher's OPEN code on, everything is unlocked, so a teacher can jump anywhere.
   All words come from KR.t(); the ids it uses are in lang/en-US.js ('shelf.*').
   ========================================= */
KR.shelf = (function () {
    const openAlbum = {};      // host id -> album id the student has opened

    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text != null) node.textContent = text;
        return node;
    }

    function albumState(album, cfg) {
        const total = album.levelIds.length;
        const done = album.levelIds.filter(id => cfg.records && cfg.records[id] && cfg.records[id].cleared).length;
        const open = album.levelIds.some(id => cfg.unlocked.has(id));
        return { total, done, open, gold: total > 0 && done === total };
    }

    function render(host, cfg) {
        const key = host.id || 'shelf';
        let selected = openAlbum[key];
        const owning = cfg.albums.find(a => a.levelIds.includes(cfg.current));
        if (!selected || !cfg.albums.some(a => a.id === selected)) selected = owning ? owning.id : cfg.albums[0].id;
        openAlbum[key] = selected;

        host.innerHTML = '';
        host.classList.add('kr-shelf');

        const crate = el('div', 'kr-crate');
        crate.setAttribute('role', 'tablist');
        cfg.albums.forEach(album => {
            const st = albumState(album, cfg);
            const sleeve = el('button', 'kr-sleeve' + (st.gold ? ' complete' : '') + (st.open ? '' : ' locked') + (album.id === selected ? ' selected' : ''));
            sleeve.type = 'button';
            sleeve.setAttribute('role', 'tab');
            sleeve.setAttribute('aria-selected', album.id === selected ? 'true' : 'false');
            sleeve.appendChild(el('span', 'kr-sleeve-disc'));
            sleeve.appendChild(el('span', 'kr-sleeve-title', KR.t(album.titleId)));
            sleeve.appendChild(el('span', 'kr-sleeve-count', st.open
                ? (st.gold ? KR.t('shelf.album.done') : KR.t('shelf.album.count', { done: st.done, total: st.total }))
                : KR.t('shelf.album.locked')));
            sleeve.onclick = () => { openAlbum[key] = album.id; render(host, cfg); };
            crate.appendChild(sleeve);
        });
        host.appendChild(crate);

        const album = cfg.albums.find(a => a.id === selected);
        const list = el('ol', 'kr-tracks');
        album.levelIds.forEach(id => {
            const isOpen = cfg.unlocked.has(id);
            const rec = cfg.records && cfg.records[id];
            const li = document.createElement('li');
            const row = el('button', 'kr-track' + (isOpen ? ' unlocked' : ' locked') + (id === cfg.current ? ' recommended' : '') + (rec && rec.cleared ? ' cleared' : ''));
            row.type = 'button';
            row.disabled = !isOpen;
            row.appendChild(el('span', 'kr-disc', id));
            row.appendChild(el('span', 'kr-track-name', cfg.levelName(id)));
            row.appendChild(el('span', 'kr-track-pts', isOpen && rec && rec.bestScore != null
                ? KR.t('shelf.track.pts', { n: Math.round(rec.bestScore) })
                : (isOpen ? '' : KR.t('shelf.track.locked'))));
            if (isOpen) row.onclick = () => cfg.onPick(id);
            li.appendChild(row);
            list.appendChild(li);
        });
        host.appendChild(list);
    }

    return { render };
})();
