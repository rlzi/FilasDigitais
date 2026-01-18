const STORAGE_KEY = "filasDigitaisData";

const defaultState = {
  services: ["Retirada", "Suporte", "Atendimento VIP"],
  queue: [],
  serving: null,
  history: [],
  counters: { A: 1, B: 1, C: 1 },
};

const elements = {
  ticketForm: document.getElementById("ticketForm"),
  serviceSelect: document.getElementById("serviceSelect"),
  serviceList: document.getElementById("serviceList"),
  serviceForm: document.getElementById("serviceForm"),
  queueList: document.getElementById("queueList"),
  historyList: document.getElementById("historyList"),
  nowServing: document.getElementById("nowServing"),
  servingMeta: document.getElementById("servingMeta"),
  callNext: document.getElementById("callNext"),
  markDone: document.getElementById("markDone"),
  markNoShow: document.getElementById("markNoShow"),
  waitingCount: document.getElementById("waitingCount"),
  servingCount: document.getElementById("servingCount"),
  doneCount: document.getElementById("doneCount"),
  avgTime: document.getElementById("avgTime"),
  nextTicket: document.getElementById("nextTicket"),
  resetDay: document.getElementById("resetDay"),
  exportData: document.getElementById("exportData"),
  insightsPanel: document.getElementById("insightsPanel"),
};

const state = loadState();

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      services: parsed.services?.length ? parsed.services : defaultState.services,
    };
  } catch (error) {
    console.warn("Falha ao carregar estado", error);
    return structuredClone(defaultState);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildTicketCode(service) {
  const letter = service.charAt(0).toUpperCase() || "A";
  state.counters[letter] = (state.counters[letter] || 1) + 1;
  return `${letter}-${String(state.counters[letter]).padStart(3, "0")}`;
}

function getNextTicketPreview() {
  const service = state.services[0] || "A";
  const letter = service.charAt(0).toUpperCase() || "A";
  const nextNumber = state.counters[letter] || 1;
  return `${letter}-${String(nextNumber).padStart(3, "0")}`;
}

function formatDuration(start, end) {
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  return `${minutes}m`;
}

function updateServiceOptions() {
  elements.serviceSelect.innerHTML = state.services
    .map((service) => `<option value="${service}">${service}</option>`)
    .join("");

  elements.serviceList.innerHTML = state.services
    .map(
      (service) => `
      <li>
        <span>${service}</span>
        <button class="ghost" data-service="${service}">Remover</button>
      </li>`
    )
    .join("");
}

function updateQueue() {
  if (!state.queue.length) {
    elements.queueList.innerHTML = "<li>Nenhum ticket aguardando.</li>";
    return;
  }

  elements.queueList.innerHTML = state.queue
    .map(
      (ticket) => `
        <li>
          <div>
            <strong>${ticket.code}</strong>
            <p class="meta">${ticket.name} • ${ticket.service}</p>
          </div>
          <span class="badge">${ticket.priority}</span>
        </li>`
    )
    .join("");
}

function updateHistory() {
  if (!state.history.length) {
    elements.historyList.innerHTML = "<li>Sem histórico ainda.</li>";
    return;
  }

  elements.historyList.innerHTML = state.history
    .slice(0, 6)
    .map(
      (ticket) => `
        <li>
          <div>
            <strong>${ticket.code}</strong>
            <p class="meta">${ticket.name} • ${ticket.service} • ${ticket.duration}</p>
          </div>
          <span class="status ${ticket.status}">${ticket.statusLabel}</span>
        </li>`
    )
    .join("");
}

function updateServing() {
  if (!state.serving) {
    elements.nowServing.textContent = "—";
    elements.servingMeta.textContent = "Sem atendimento em andamento.";
    return;
  }

  elements.nowServing.textContent = state.serving.code;
  elements.servingMeta.textContent = `${state.serving.name} • ${state.serving.service}`;
}

function updateStats() {
  elements.waitingCount.textContent = state.queue.length;
  elements.servingCount.textContent = state.serving ? 1 : 0;
  elements.doneCount.textContent = state.history.filter((item) => item.status === "done").length;

  if (!state.history.length) {
    elements.avgTime.textContent = "0m";
    return;
  }

  const totalMinutes = state.history.reduce((acc, item) => {
    const minutes = parseInt(item.duration.replace("m", ""), 10);
    return acc + (Number.isNaN(minutes) ? 0 : minutes);
  }, 0);

  elements.avgTime.textContent = `${Math.round(totalMinutes / state.history.length)}m`;
}

function updateInsights() {
  const insights = [];
  const noShows = state.history.filter((item) => item.status === "no-show").length;
  const completed = state.history.filter((item) => item.status === "done").length;
  const peakService = state.queue.reduce((acc, ticket) => {
    acc[ticket.service] = (acc[ticket.service] || 0) + 1;
    return acc;
  }, {});
  const topService = Object.entries(peakService).sort((a, b) => b[1] - a[1])[0];

  insights.push(`Fila ativa com ${state.queue.length} tickets.`);
  insights.push(`Atendimentos concluídos: ${completed}.`);
  insights.push(`Não compareceram: ${noShows}.`);

  if (topService) {
    insights.push(`Serviço com maior demanda: ${topService[0]}.`);
  }

  elements.insightsPanel.innerHTML = insights.map((item) => `<p>${item}</p>`).join("");
}

function render() {
  updateServiceOptions();
  updateQueue();
  updateHistory();
  updateServing();
  updateStats();
  updateInsights();
  elements.nextTicket.textContent = getNextTicketPreview();
  persistState();
}

function createTicket({ name, service, priority }) {
  const ticket = {
    id: crypto.randomUUID(),
    name,
    service,
    priority,
    code: buildTicketCode(service),
    createdAt: Date.now(),
  };

  if (priority === "preferencial") {
    const index = state.queue.findIndex((item) => item.priority !== "preferencial");
    if (index === -1) {
      state.queue.push(ticket);
    } else {
      state.queue.splice(index, 0, ticket);
    }
  } else {
    state.queue.push(ticket);
  }
}

function callNextTicket() {
  if (state.serving) return;
  const nextTicket = state.queue.shift();
  if (!nextTicket) return;
  state.serving = { ...nextTicket, startedAt: Date.now() };
}

function finalizeTicket(status) {
  if (!state.serving) return;
  const endedAt = Date.now();
  const duration = formatDuration(state.serving.startedAt, endedAt);
  state.history.unshift({
    ...state.serving,
    status,
    statusLabel: status === "done" ? "Concluído" : "No-show",
    duration,
  });
  state.serving = null;
}

function resetDay() {
  state.queue = [];
  state.serving = null;
  state.history = [];
  state.counters = { A: 1, B: 1, C: 1 };
}

function exportData() {
  const payload = {
    date: new Date().toISOString(),
    queue: state.queue,
    serving: state.serving,
    history: state.history,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fila-digital-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  elements.ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    createTicket({
      name: formData.get("name"),
      service: formData.get("service"),
      priority: formData.get("priority"),
    });
    event.target.reset();
    render();
  });

  elements.serviceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const service = formData.get("service").trim();
    if (!service || state.services.includes(service)) return;
    state.services.push(service);
    event.target.reset();
    render();
  });

  elements.serviceList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    const service = target.dataset.service;
    state.services = state.services.filter((item) => item !== service);
    if (!state.services.length) {
      state.services = [...defaultState.services];
    }
    render();
  });

  elements.callNext.addEventListener("click", () => {
    callNextTicket();
    render();
  });

  elements.markDone.addEventListener("click", () => {
    finalizeTicket("done");
    render();
  });

  elements.markNoShow.addEventListener("click", () => {
    finalizeTicket("no-show");
    render();
  });

  elements.resetDay.addEventListener("click", () => {
    resetDay();
    render();
  });

  elements.exportData.addEventListener("click", () => {
    exportData();
  });
}

bindEvents();
render();
