const topics = [
  {
    id: "analog",
    label: "Analog IC",
    defaultQuery: "cmos opamp OR adc OR dac OR pll OR ldo",
    terms: ["analog", "ic", "cmos", "opamp", "adc", "dac", "pll", "ldo"],
  },
  {
    id: "digital",
    label: "Digital RTL",
    defaultQuery: "verilog rtl OR systemverilog rtl OR asic fpga",
    terms: ["rtl", "verilog", "systemverilog", "asic", "fpga"],
  },
  {
    id: "eda",
    label: "EDA Flow",
    defaultQuery: "openlane OR openroad OR yosys OR klayout OR vlsi",
    terms: ["eda", "vlsi", "openlane", "yosys", "klayout", "magic"],
  },
  {
    id: "verification",
    label: "Verification",
    defaultQuery: "cocotb OR uvm OR systemverilog testbench OR riscv-formal",
    terms: ["verification", "uvm", "cocotb", "testbench", "formal"],
  },
  {
    id: "layout",
    label: "Layout/PDK",
    defaultQuery: "sky130 OR gf180 OR open-source pdk OR klayout",
    terms: ["layout", "pdk", "sky130", "gf180", "drc", "lvs", "pex"],
  },
  {
    id: "computer",
    label: "CPU/RISC-V",
    defaultQuery: "riscv OR risc-v OR riscv core OR cpu rtl",
    terms: ["risc-v", "processor", "cpu", "cache", "soc"],
  },
];

const state = {
  selectedTopic: "eda",
  results: [],
  sessionRequests: 0,
  rateRemaining: "--",
  activeQuery: "",
};

const storageKeys = {
  saved: "ic-project-tracker:saved",
  totalRequests: "ic-project-tracker:total-requests",
  history: "ic-project-tracker:history",
};

const elements = {
  form: document.querySelector("#searchForm"),
  topicGrid: document.querySelector("#topicGrid"),
  keywordInput: document.querySelector("#keywordInput"),
  languageSelect: document.querySelector("#languageSelect"),
  sortSelect: document.querySelector("#sortSelect"),
  minStarsInput: document.querySelector("#minStarsInput"),
  updatedSelect: document.querySelector("#updatedSelect"),
  excludeArchivedInput: document.querySelector("#excludeArchivedInput"),
  tokenInput: document.querySelector("#tokenInput"),
  resultsGrid: document.querySelector("#resultsGrid"),
  statusLine: document.querySelector("#statusLine"),
  queryLine: document.querySelector("#queryLine"),
  githubSearchLink: document.querySelector("#githubSearchLink"),
  resultCount: document.querySelector("#resultCount"),
  topStars: document.querySelector("#topStars"),
  activeCount: document.querySelector("#activeCount"),
  rateLimit: document.querySelector("#rateLimit"),
  savedList: document.querySelector("#savedList"),
  exportButton: document.querySelector("#exportButton"),
  refreshButton: document.querySelector("#refreshButton"),
  trafficButton: document.querySelector("#trafficButton"),
  trafficDialog: document.querySelector("#trafficDialog"),
  closeTrafficButton: document.querySelector("#closeTrafficButton"),
  sessionRequests: document.querySelector("#sessionRequests"),
  totalRequests: document.querySelector("#totalRequests"),
  lastQueryTime: document.querySelector("#lastQueryTime"),
  historyList: document.querySelector("#historyList"),
};

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard" }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days));
  return date.toISOString().slice(0, 10);
}

function renderTopics() {
  elements.topicGrid.innerHTML = topics
    .map(
      (topic) => `
        <button class="topic-button ${topic.id === state.selectedTopic ? "active" : ""}" type="button" data-topic="${topic.id}">
          ${escapeHtml(topic.label)}
        </button>
      `,
    )
    .join("");
}

function getSelectedTopic() {
  return topics.find((topic) => topic.id === state.selectedTopic) ?? topics[0];
}

function buildSearchQuery() {
  const keyword = elements.keywordInput.value.trim();
  const selectedTopic = getSelectedTopic();
  const minStars = Math.max(0, Number(elements.minStarsInput.value || 0));
  const language = elements.languageSelect.value;
  const updated = elements.updatedSelect.value;
  const excludeArchived = elements.excludeArchivedInput.checked;

  const terms = keyword ? keyword : selectedTopic.defaultQuery;
  const qualifiers = [`stars:>=${minStars}`];

  if (language) qualifiers.push(`language:"${language}"`);
  if (updated) qualifiers.push(`pushed:>=${daysAgo(updated)}`);
  if (excludeArchived) qualifiers.push("archived:false");

  return `${terms} ${qualifiers.join(" ")}`.trim();
}

function buildApiUrl(query) {
  const [sort, order] = elements.sortSelect.value.split("-");
  const params = new URLSearchParams({
    q: query,
    per_page: "50",
    order: order || "desc",
  });

  if (["stars", "forks", "updated"].includes(sort)) {
    params.set("sort", sort);
  }

  return `https://api.github.com/search/repositories?${params.toString()}`;
}

function buildGithubSearchUrl(query) {
  const params = new URLSearchParams({
    q: query,
    type: "repositories",
  });
  return `https://github.com/search?${params.toString()}`;
}

function scoreRepository(repo) {
  const selectedTerms = getSelectedTopic().terms;
  const haystack = `${repo.full_name} ${repo.description ?? ""} ${(repo.topics ?? []).join(" ")}`.toLowerCase();
  const keywordHits = selectedTerms.reduce((count, term) => count + (haystack.includes(term.toLowerCase()) ? 1 : 0), 0);
  const starScore = Math.log10((repo.stargazers_count || 0) + 1) * 18;
  const forkScore = Math.log10((repo.forks_count || 0) + 1) * 8;
  const updatedDays = Math.max(1, (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000);
  const freshnessScore = Math.max(0, 24 - Math.log(updatedDays) * 5);

  return Math.round(keywordHits * 12 + starScore + forkScore + freshnessScore);
}

function normalizeRepository(repo) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login ?? "",
    avatar: repo.owner?.avatar_url ?? "",
    url: repo.html_url,
    description: repo.description ?? "No description",
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    language: repo.language ?? "Unknown",
    license: repo.license?.spdx_id ?? "NOASSERTION",
    updated: repo.pushed_at,
    topics: repo.topics ?? [],
    archived: Boolean(repo.archived),
    score: scoreRepository(repo),
  };
}

function sortedResults(results) {
  const [sort] = elements.sortSelect.value.split("-");
  return [...results].sort((a, b) => {
    if (sort === "updated") return new Date(b.updated) - new Date(a.updated);
    if (sort === "forks") return b.forks - a.forks;
    if (sort === "score") return b.score - a.score;
    return b.stars - a.stars;
  });
}

function getSaved() {
  return readJson(storageKeys.saved, []);
}

function isSaved(repoId) {
  return getSaved().some((repo) => repo.id === repoId);
}

function saveRepository(repo) {
  const saved = getSaved();
  if (saved.some((item) => item.id === repo.id)) {
    writeJson(
      storageKeys.saved,
      saved.filter((item) => item.id !== repo.id),
    );
    return;
  }

  writeJson(storageKeys.saved, [
    {
      id: repo.id,
      fullName: repo.fullName,
      url: repo.url,
      stars: repo.stars,
      language: repo.language,
      savedAt: new Date().toISOString(),
    },
    ...saved,
  ]);
}

function renderSavedList() {
  const saved = getSaved();
  if (!saved.length) {
    elements.savedList.innerHTML = `<p class="empty-state">暂无关注项目</p>`;
    return;
  }

  elements.savedList.innerHTML = saved
    .map(
      (repo) => `
        <div class="saved-item">
          <div>
            <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.fullName)}</a>
            <span>${escapeHtml(repo.language)} · ★ ${formatNumber(repo.stars)}</span>
          </div>
          <button class="text-button" type="button" data-remove-saved="${repo.id}">移除</button>
        </div>
      `,
    )
    .join("");
}

function renderResults() {
  const results = sortedResults(state.results);
  if (!results.length) {
    elements.resultsGrid.innerHTML = `<p class="empty-state">没有结果。可以降低最低 Stars、放宽更新时间，或换一个关键词。</p>`;
    updateMetrics(results);
    return;
  }

  elements.resultsGrid.innerHTML = results
    .map((repo) => {
      const saved = isSaved(repo.id);
      const topicsHtml = repo.topics
        .slice(0, 5)
        .map((topic) => `<span class="topic-pill">${escapeHtml(topic)}</span>`)
        .join("");

      return `
        <article class="repo-card">
          <div class="repo-top">
            <img class="avatar" src="${escapeHtml(repo.avatar)}" alt="" loading="lazy" />
            <div>
              <h3><a class="repo-name" href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.fullName)}</a></h3>
              <p class="repo-owner">${escapeHtml(repo.owner)} · updated ${formatDate(repo.updated)}</p>
            </div>
          </div>
          <p class="repo-description">${escapeHtml(repo.description)}</p>
          <div class="repo-meta">
            <span class="meta-pill">★ ${formatNumber(repo.stars)}</span>
            <span class="meta-pill">⑂ ${formatNumber(repo.forks)}</span>
            <span class="meta-pill">${escapeHtml(repo.language)}</span>
            <span class="meta-pill">${escapeHtml(repo.license)}</span>
            <span class="score-pill">score ${repo.score}</span>
          </div>
          <div class="chip-row">${topicsHtml}</div>
          <div class="repo-actions">
            <a href="${escapeHtml(repo.url)}" target="_blank" rel="noreferrer">打开仓库</a>
            <button class="${saved ? "saved" : ""}" type="button" data-save-repo="${repo.id}">
              ${saved ? "已关注" : "关注"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  updateMetrics(results);
}

function updateMetrics(results) {
  const topStars = results.reduce((max, repo) => Math.max(max, repo.stars), 0);
  const activeCount = results.filter((repo) => {
    const pushed = new Date(repo.updated).getTime();
    return Date.now() - pushed <= 365 * 86400000;
  }).length;

  elements.resultCount.textContent = String(results.length);
  elements.topStars.textContent = formatNumber(topStars);
  elements.activeCount.textContent = String(activeCount);
  elements.rateLimit.textContent = String(state.rateRemaining);
}

function setLoading(isLoading) {
  elements.form.querySelector(".primary-button").disabled = isLoading;
  elements.refreshButton.disabled = isLoading;
  if (isLoading) {
    elements.statusLine.textContent = "正在检索 GitHub...";
  }
}

function updateRequestStats(query, resultCount) {
  state.sessionRequests += 1;
  const total = Number(localStorage.getItem(storageKeys.totalRequests) || 0) + 1;
  localStorage.setItem(storageKeys.totalRequests, String(total));

  const history = readJson(storageKeys.history, []);
  history.unshift({
    time: new Date().toISOString(),
    query,
    resultCount,
  });
  writeJson(storageKeys.history, history.slice(0, 20));
}

function renderTraffic() {
  const history = readJson(storageKeys.history, []);
  elements.sessionRequests.textContent = String(state.sessionRequests);
  elements.totalRequests.textContent = localStorage.getItem(storageKeys.totalRequests) || "0";
  elements.lastQueryTime.textContent = history[0] ? formatDate(history[0].time) : "--";

  if (!history.length) {
    elements.historyList.innerHTML = `<p class="empty-state">暂无请求记录</p>`;
    return;
  }

  elements.historyList.innerHTML = history
    .map(
      (item) => `
        <div class="history-item">
          <strong>${formatDate(item.time)}</strong>
          <span>${escapeHtml(item.query)}</span>
          <span>${item.resultCount} 项</span>
        </div>
      `,
    )
    .join("");
}

async function searchRepositories() {
  const query = buildSearchQuery();
  const apiUrl = buildApiUrl(query);
  const token = elements.tokenInput.value.trim();

  state.activeQuery = query;
  elements.queryLine.textContent = query;
  elements.githubSearchLink.href = buildGithubSearchUrl(query);
  setLoading(true);

  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(apiUrl, { headers });
    state.rateRemaining = response.headers.get("X-RateLimit-Remaining") ?? "--";

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || `GitHub API ${response.status}`);
    }

    const payload = await response.json();
    state.results = (payload.items ?? []).map(normalizeRepository);
    updateRequestStats(query, state.results.length);
    elements.statusLine.textContent = `检索完成：GitHub 返回 ${payload.total_count ?? state.results.length} 个匹配仓库`;
    renderResults();
  } catch (error) {
    state.results = [];
    elements.statusLine.innerHTML = `<span class="error-text">检索失败：${escapeHtml(error.message)}</span>`;
    elements.resultsGrid.innerHTML = `<p class="empty-state">如果遇到 API rate limit，可以临时填入 GitHub Token 后重试。</p>`;
    updateMetrics([]);
  } finally {
    setLoading(false);
    renderTraffic();
  }
}

function exportSavedCsv() {
  const saved = getSaved();
  if (!saved.length) return;

  const rows = [
    ["repo", "url", "stars", "language", "saved_at"],
    ...saved.map((repo) => [repo.fullName, repo.url, repo.stars, repo.language, repo.savedAt]),
  ];
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ic-github-watchlist-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.topicGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  state.selectedTopic = button.dataset.topic;
  renderTopics();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchRepositories();
});

elements.refreshButton.addEventListener("click", () => searchRepositories());

elements.sortSelect.addEventListener("change", renderResults);

elements.resultsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save-repo]");
  if (!button) return;
  const repo = state.results.find((item) => String(item.id) === button.dataset.saveRepo);
  if (!repo) return;
  saveRepository(repo);
  renderSavedList();
  renderResults();
});

elements.savedList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-saved]");
  if (!button) return;
  writeJson(
    storageKeys.saved,
    getSaved().filter((repo) => String(repo.id) !== button.dataset.removeSaved),
  );
  renderSavedList();
  renderResults();
});

elements.exportButton.addEventListener("click", exportSavedCsv);

elements.trafficButton.addEventListener("click", () => {
  renderTraffic();
  elements.trafficDialog.showModal();
});

elements.closeTrafficButton.addEventListener("click", () => {
  elements.trafficDialog.close();
});

renderTopics();
renderSavedList();
renderTraffic();
searchRepositories();
