/* 신승교회 공통 동작: 메뉴, 예배 시간 표시, 넘치는 버튼 줄, 사진 크게 보기 */
(function () {
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* 머리 메뉴 */
  const top = $(".top"), burger = $(".burger");
  /* 내릴 때는 메뉴 띠를 위로 숨기고, 올리면 다시 보인다 (내용 위에 계속 떠 있지 않게) */
  let lastY = scrollY;
  const lift = () => {
    if (!top) return;
    const y = scrollY, open = top.classList.contains("open");
    top.classList.toggle("lift", y > 30);
    if (!open && y > 240 && y > lastY + 6) { top.classList.add("hide"); document.body.classList.add("head-off"); }
    else if (open || y < lastY - 6 || y <= 240) { top.classList.remove("hide"); document.body.classList.remove("head-off"); }
    if (Math.abs(y - lastY) > 6) lastY = y;
  };
  addEventListener("scroll", lift, { passive: true }); lift();
  if (top) top.addEventListener("focusin", () => { top.classList.remove("hide"); document.body.classList.remove("head-off"); });
  if (burger) burger.addEventListener("click", () => {
    const open = top.classList.toggle("open");
    burger.setAttribute("aria-expanded", open); burger.innerHTML = open ? '<span aria-hidden="true">✕</span> 닫기' : '<span aria-hidden="true">☰</span> 메뉴';
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { $$(".menu>li.sub-open").forEach(x => x.classList.toggle("sub-open", false)); const h = $(".menu>li.here"); if (h) h.classList.add("sub-open"); }
  });
  /* 폰 메뉴: 묶음 단추를 누르면 그 묶음만 펼친다(다 펼쳐져 한눈에 안 들어오던 것, 사용자 2026-11-14). PC는 그대로 이동 */
  $$(".menu>li>a").forEach(a => a.addEventListener("click", e => {
    const li = a.parentElement;
    if (!top || !top.classList.contains("open") || !li.querySelector(".drop")) return;
    e.preventDefault();
    const was = li.classList.contains("sub-open");
    $$(".menu>li.sub-open").forEach(x => x.classList.toggle("sub-open", false));
    if (!was) li.classList.add("sub-open");
  }));
  addEventListener("keydown", e => { if (e.key === "Escape" && top && top.classList.contains("open")) burger.click(); });

  /* 예배 시간 (기존 홈페이지 기준) */
  const SUN = [{ n: "주일 1부 예배", h: 9, m: 0 }, { n: "주일 2부 예배", h: 10, m: 50 }, { n: "주일 저녁찬양예배", h: 18, m: 45 }];
  const WEEK = [{ n: "새벽예배", h: 5, m: 0, days: [1, 2, 3, 4, 5, 6] }, { n: "삼일예배", h: 19, m: 0, days: [3] },
    { n: "민족제단예배", h: 10, m: 0, days: [6] }, { n: "페트라워십", h: 20, m: 30, days: [5], last: true }];
  const lastWeek = d => { const x = new Date(d); x.setDate(x.getDate() + 7); return x.getMonth() !== d.getMonth(); };
  const kst = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const fmt = (h, m) => ({ ap: h < 12 ? "오전" : "오후", t: ((h % 12) || 12) + ":" + String(m).padStart(2, "0") });
  /* 예배 시간 카드: 오늘 이미 끝난 예배는 '지남'(흐리게), 드리는 중이면 '지금 예배 중', 남았으면 '오늘', 앞으로 가장 먼저 오는 예배에 '다음' */
  const now0 = kst();
  let soon = null;
  $$(".slot[data-days]").forEach(el => {
    const days = el.dataset.days.split(",").map(Number), h = +el.dataset.h, m = +el.dataset.m;
    for (let k = 0; k < 9; k++) {
      const day = new Date(now0.getFullYear(), now0.getMonth(), now0.getDate() + k);
      if (!days.includes(day.getDay()) || (el.dataset.last && !lastWeek(day))) continue;
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (k === 0) {
        if (now0 - at >= 70 * 60000) continue;
        if (now0 >= at) { el.classList.add("today"); el.dataset.badge = "지금 예배 중"; break; }
        el.classList.add("today"); el.dataset.badge = "오늘";
      }
      if (!soon || at < soon.at) soon = { at, els: [el] }; else if (+at === +soon.at) soon.els.push(el);
      break;
    }
  });
  if (soon) soon.els.forEach(el => { el.classList.add("soon"); el.dataset.badge = el.classList.contains("today") ? "다음 · 오늘" : "다음"; });
  const nm = $("#nextName"), ct = $("#nextCount"), lv = $("#nextLive"), lb = $("#nextLabel");
  const LIVE_NAMES = lv ? (lv.dataset.names || "").split("|") : [];
  function tick() {
    const now = kst(), all = [];
    for (let k = 0; k < 9; k++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k), wd = day.getDay();
      const push = s => all.push({ n: s.n, at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.h, s.m) });
      if (wd === 0) SUN.forEach(push);
      WEEK.forEach(s => { if (s.days.includes(wd) && (!s.last || lastWeek(day))) push(s); });
    }
    all.sort((a, b) => a.at - b.at);
    const live = all.find(x => now >= x.at && now - x.at < 70 * 60000 && LIVE_NAMES.includes(x.n)), nx = all.find(x => x.at > now);
    if (live) {
      nm.textContent = live.n; ct.textContent = "지금 예배드리는 중"; if (lb) lb.textContent = "지금 드리는 예배";
      if (lv) lv.hidden = false;  /* 유튜브로 중계하는 예배일 때만 여기로 온다 */
      return;
    }
    if (lv) lv.hidden = true;
    if (lb) lb.textContent = "다음 예배";
    if (!nx) return;
    let s = Math.floor((nx.at - now) / 1000);
    const d = Math.floor(s / 86400); s %= 86400; const h = Math.floor(s / 3600); s %= 3600; const m = Math.floor(s / 60); s %= 60;
    const f = fmt(nx.at.getHours(), nx.at.getMinutes()), p2 = n => String(n).padStart(2, "0");
    const word = nx.at.toDateString() === now.toDateString() ? "오늘" : ["일", "월", "화", "수", "목", "금", "토"][nx.at.getDay()] + "요일";
    nm.textContent = `${nx.n} · ${word} ${f.ap} ${f.t}`;
    ct.textContent = (d ? "D-" + d + " " : "") + p2(h) + ":" + p2(m) + ":" + p2(s) + " 남음";
  }
  if (nm && ct) { tick(); setInterval(tick, 1000); }

  /* 옆으로 넘치는 버튼 줄(하위 메뉴, 예배별 설교): 지금 쪽을 가운데로, 더 있으면 오른쪽 끝을 흐리게 */
  $$(".subnav ul, .boards ul").forEach(ul => {
    const mark = () => {
      const over = ul.scrollWidth > ul.clientWidth + 2;
      ul.classList.toggle("more-r", over && ul.scrollLeft + ul.clientWidth < ul.scrollWidth - 4);
      ul.classList.toggle("more-l", over && ul.scrollLeft > 4);
    };
    const cur = $("[aria-current]", ul);
    if (cur && ul.scrollWidth > ul.clientWidth) ul.scrollLeft = cur.offsetLeft - ul.offsetLeft - (ul.clientWidth - cur.offsetWidth) / 2;
    ul.addEventListener("scroll", mark, { passive: true }); addEventListener("resize", mark); mark();
  });

  /* 폰 첫 화면 펼치기·접기: 폰(700px 이하)이면 data-mopen이 0인 칸을 접고, PC면 늘 펼친다 */
  const small = matchMedia("(max-width:700px)");
  const fold = () => $$("details.mfold, details.wfold").forEach(d => { d.open = small.matches ? d.dataset.mopen === "1" : true; });
  fold(); small.addEventListener("change", fold);

  /* 사진 크게 보기 */
  const data = $("#albums");
  if (data) {
    const albums = JSON.parse(data.textContent);
    const box = document.createElement("div");
    box.className = "box"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "사진 크게 보기");
    box.innerHTML = '<button class="x" type="button">닫기</button><button class="pv" type="button" aria-label="이전 사진">‹</button><p aria-live="polite"></p><a class="orig" target="_blank" rel="noopener"></a><button class="nx" type="button" aria-label="다음 사진">›</button>';
    document.body.appendChild(box);
    const cap = $("p", box), orig = $(".orig", box), img = document.createElement("img");
    let cur = null, i = 0, back = null;
    const paint = () => {
      if (!img.isConnected) box.insertBefore(img, cap); const ph = cur.photos[i]; img.src = ph.m; img.alt = `${cur.title} 사진 ${i + 1}`;
      cap.textContent = `${cur.title} · ${i + 1} / ${cur.photos.length}` + (cur.total > cur.photos.length && i === cur.photos.length - 1 ? " · 마지막 장입니다" : "");
      orig.hidden = !cur.url; if (cur.url) { orig.href = cur.url; orig.textContent = cur.total > cur.photos.length ? `이 앨범 전체 ${cur.total}장 보기 ↗` : "이 앨범 전체 보기 ↗"; }
    };
    const open = (id, at, from) => { cur = albums.find(a => a.id === id); if (!cur) return; i = at || 0; back = from; box.classList.add("on"); document.body.style.overflow = "hidden"; paint(); $(".x", box).focus(); };
    const close = () => { box.classList.remove("on"); document.body.style.overflow = ""; if (back) back.focus(); };
    const step = n => { i = (i + n + cur.photos.length) % cur.photos.length; paint(); };
    $(".x", box).addEventListener("click", close);
    $(".pv", box).addEventListener("click", () => step(-1));
    $(".nx", box).addEventListener("click", () => step(1));
    box.addEventListener("click", e => { if (e.target === box) close(); });
    /* 폰: 손가락으로 옆으로 밀면 넘어간다 */
    let sx = null, sy = 0;
    box.addEventListener("touchstart", e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener("touchend", e => {
      if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
    }, { passive: true });
    addEventListener("keydown", e => {
      if (!box.classList.contains("on")) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") { const f = $$("button, a:not([hidden])", box), k = f.indexOf(document.activeElement); e.preventDefault(); f[(k + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
    });
    $$("[data-album]").forEach(b => b.addEventListener("click", () => open(b.dataset.album, +(b.dataset.at || 0), b)));
  }
})();
