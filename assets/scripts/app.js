document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const startScreen = document.getElementById('startScreen');
  const orderScreen = document.getElementById('orderScreen');

  const cols = [...document.querySelectorAll('.col')];
  const modal = document.getElementById('scoreModal');
  const scoreVal = document.getElementById('scoreVal');
  const timeVal = document.getElementById('timeVal');
  const pbVal = document.getElementById('pbVal');
  const newBadge = document.getElementById('newBadge');
  const btnAgain = document.getElementById('btnAgain');
  const timerEl = document.getElementById('roundTimer');
  const pbToast = document.getElementById('pbToast');

  const totalTablesEl = document.getElementById('totalTables');
  const totalTablesModalEl = document.getElementById('totalTablesModal');
  const btnEndSession = document.getElementById('btnEndSession');
  const endModal = document.getElementById('endModal');
  const endTotalEl = document.getElementById('endTotal');
  const endAvgTimeEl = document.getElementById('endAvgTime');
  const endFastestEl = document.getElementById('endFastest');
  const endAvgColourEl = document.getElementById('endAvgColour');
  const btnStartOver = document.getElementById('btnStartOver');

  const items = [
    {key:'1', label:'1 glass', img:'assets/images/1-glass.png'},
    {key:'2', label:'2 glasses', img:'assets/images/2-glasses.png'},
    {key:'3', label:'3 glasses', img:'assets/images/3-glasses.png'},
    {key:'4', label:'4 glasses', img:'assets/images/4-glasses.png'},
    {key:'jug', label:'1 jug', img:'assets/images/jug.png'},
  ];

  const LS_PB = 'drinks_pb_seconds';
  const LS_TOTAL = 'drinks_total_tables';
  const LS_COLOUR_SUM = 'drinks_colour_sum';
  const LS_COLOUR_COUNT = 'drinks_colour_count';
  const LS_TIMES = 'drinks_times_seconds';

  let spawnTimer = null;
  let roundTimer = null;
  let seconds = 0;
  let completed = 0;
  let totalTables = 0;
  let colourSum = 0;
  let colourCount = 0;

  const tableHasTicket = [false,false,false,false,false];
  const clickedStates = [];

  function fmtMMSS(s){
    const m = Math.floor(s/60).toString().padStart(2,'0');
    const sec = (s%60).toString().padStart(2,'0');
    return `${m}:${sec}`;
  }

  function loadPB(){ return Number(localStorage.getItem(LS_PB)) || null; }
  function savePB(s){ localStorage.setItem(LS_PB, String(s)); }

  function loadTotal(){ return Number(localStorage.getItem(LS_TOTAL)) || 0; }
  function saveTotal(n){ localStorage.setItem(LS_TOTAL, String(n)); }

  function loadColourStats(){
    return {
      sum: Number(localStorage.getItem(LS_COLOUR_SUM)) || 0,
      count: Number(localStorage.getItem(LS_COLOUR_COUNT)) || 0
    };
  }
  function saveColourStats(sum, count){
    localStorage.setItem(LS_COLOUR_SUM, String(sum));
    localStorage.setItem(LS_COLOUR_COUNT, String(count));
  }

  function saveTime(s){
    const arr = JSON.parse(localStorage.getItem(LS_TIMES) || '[]');
    arr.push(s);
    localStorage.setItem(LS_TIMES, JSON.stringify(arr.slice(-50)));
  }

  function average(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

  function randomTable(){
    const options = [1,2,3,4].filter(t => !tableHasTicket[t]);
    if (options.length === 0) return null;
    return options[Math.floor(Math.random()*options.length)];
  }

  function randomItem(){ return items[Math.floor(Math.random()*items.length)]; }

  function averageColourLabel(avg){
    if (avg < 0.5) return {label:'Green', cls:'state-green'};
    if (avg < 1.5) return {label:'Orange', cls:'state-orange'};
    if (avg < 2.5) return {label:'Red', cls:'state-red'};
    return {label:'Flashing Red', cls:'state-flash'};
  }

  function incTotalTables(){
    totalTables = (Number(totalTables) || 0) + 1;
    saveTotal(totalTables);
    if (totalTablesEl) totalTablesEl.textContent = totalTables;
  }

  function makeTicketForTable(table){
    const col = cols[table-1];
    if (!col || tableHasTicket[table]) return;
    const data = randomItem();
    const ticket = document.createElement('article');
    ticket.className = 'ticket';
    ticket.setAttribute('role','button');
    ticket.dataset.table = String(table);
    ticket.innerHTML = `
      <div class="ticket-head state-green">
        <div>Table <span class="badge small">#${table}</span></div>
        <div class="age timer" aria-label="age">00:00</div>
      </div>
      <div class="ticket-body">
        <img src="${data.img}" alt="" />
        <div class="item">${data.label}</div>
      </div>
    `;
    col.appendChild(ticket);
    col.querySelector('.col-empty')?.classList.add('hidden');
    tableHasTicket[table] = true;

    // Colour shift every 20s intervals
    const head = ticket.querySelector('.ticket-head');
    const ageEl = ticket.querySelector('.age');
    let ageSec = 0;
    let state = 0;
    const t = setInterval(() => {
      ageSec += 1;
      ageEl.textContent = fmtMMSS(ageSec);
      if (state === 0 && ageSec >= 20){ head.classList.remove('state-green'); head.classList.add('state-orange'); state = 1; }
      else if (state === 1 && ageSec >= 40){ head.classList.remove('state-orange'); head.classList.add('state-red'); state = 2; }
      else if (state === 2 && ageSec >= 60){ head.classList.add('state-flash'); state = 3; }
    }, 1000);

    ticket.addEventListener('click', () => {
      if (ticket.classList.contains('completed') || ticket.dataset.done === '1') return;
      ticket.dataset.done = '1';

      ticket.classList.add('completed');
      clearInterval(t);

      clickedStates.push(state);
      completed++;
      colourSum += state;
      colourCount += 1;
      saveColourStats(colourSum, colourCount);

      // increment total once per cleared table
      incTotalTables();

      if (completed >= 4) finishRound();
    });
  }

  function spawnOrder(){
    const table = randomTable();
    if (table) makeTicketForTable(table);
  }

  function startOrders(){
    cols.forEach((c, i) => {
      c.innerHTML = `<div class="col-title">Table ${i+1}</div><div class="col-empty">Waiting for orders…</div>`;
    });
    for (let i=1;i<=4;i++) tableHasTicket[i] = false;
    completed = 0;
    seconds = 0;
    clickedStates.length = 0;
    timerEl.textContent = '00:00';

    if (roundTimer) clearInterval(roundTimer);
    roundTimer = setInterval(()=>{ seconds++; timerEl.textContent = fmtMMSS(seconds); }, 1000);

    spawnOrder();
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = setInterval(spawnOrder, 10000);
  }

  function finishRound(){
    if (spawnTimer) clearInterval(spawnTimer);
    if (roundTimer) clearInterval(roundTimer);

    const time = seconds;
    saveTime(time);
    const prevPB = loadPB();
    let isNew = false;
    if (prevPB === null || time < prevPB){
      savePB(time);
      isNew = true;
    }

    const avg = clickedStates.length ? clickedStates.reduce((a,b)=>a+b,0)/clickedStates.length : 0;
    const avgInfo = averageColourLabel(avg);

    scoreVal.innerHTML = `4 / 4 orders cleared • <span class="chip ${avgInfo.cls}">${avgInfo.label}</span>`;
    timeVal.textContent = fmtMMSS(time);
    const best = loadPB();
    pbVal.textContent = best ? fmtMMSS(best) : '—';
    if (totalTablesModalEl) totalTablesModalEl.textContent = totalTables;
    newBadge.classList.toggle('hidden', !isNew);

    // re-trigger gold flash and PB toast
    timeVal.classList.remove('gold-flash');
    void timeVal.offsetWidth;
    if (isNew) {
      timeVal.classList.add('gold-flash');
      if (pbToast){
        pbToast.classList.remove('show');
        void pbToast.offsetWidth;
        pbToast.classList.add('show');
      }
    }

    modal.classList.add('active');
  }

  btnAgain.addEventListener('click', () => {
    modal.classList.remove('active');
    startOrders();
  });

  // ---- End session summary ----
  function showEndSession(){
    const total = loadTotal();
    const times = JSON.parse(localStorage.getItem(LS_TIMES) || '[]');
    const avgTime = times.length ? Math.round(average(times)) : 0;
    const fastest = times.length ? Math.min(...times) : 0;
    const cs = loadColourStats();
    const avgColour = (cs.count ? cs.sum/cs.count : 0);
    const info = averageColourLabel(avgColour);

    if(endTotalEl) endTotalEl.textContent = total;
    if(endAvgTimeEl) endAvgTimeEl.textContent = fmtMMSS(avgTime);
    if(endFastestEl) endFastestEl.textContent = fmtMMSS(fastest);
    if(endAvgColourEl){ endAvgColourEl.textContent = info.label; endAvgColourEl.className = 'chip ' + info.cls; }

    endModal.classList.add('active');
  }

  btnEndSession?.addEventListener('click', showEndSession);

  btnStartOver?.addEventListener('click', () => {
    saveTotal(0);
    localStorage.setItem(LS_TIMES, '[]');
    saveColourStats(0,0);
    endModal.classList.remove('active');
    orderScreen.classList.remove('active'); orderScreen.classList.add('hidden');
    startScreen.classList.remove('hidden'); startScreen.classList.add('active');
    totalTables = 0;
    if(totalTablesEl) totalTablesEl.textContent = 0;
  });

  // ---- Navigation ----
  startBtn?.addEventListener('click', () => {
    totalTables = loadTotal();
    if(totalTablesEl) totalTablesEl.textContent = totalTables;
    const c = loadColourStats(); colourSum = c.sum; colourCount = c.count;
    startScreen.classList.remove('active'); startScreen.classList.add('hidden');
    orderScreen.classList.remove('hidden'); orderScreen.classList.add('active');
    startOrders();
  });
});
