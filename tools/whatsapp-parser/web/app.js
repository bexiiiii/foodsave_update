const els = {
  input: document.querySelector("#messageInput"),
  expiryDate: document.querySelector("#expiryDateInput"),
  parseBtn: document.querySelector("#parseBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  sampleBtn: document.querySelector("#sampleBtn"),
  status: document.querySelector("#status"),
  total: document.querySelector("#totalCount"),
  ok: document.querySelector("#okCount"),
  review: document.querySelector("#reviewCount"),
  body: document.querySelector("#itemsBody"),
  tabs: [...document.querySelectorAll(".tab")],
  dryRunBtn: document.querySelector("#dryRunBtn"),
  sendCrmBtn: document.querySelector("#sendCrmBtn"),
  uploadReport: document.querySelector("#uploadReport"),
  editor: document.querySelector("#itemEditor"),
  editorTitle: document.querySelector("#editorTitle"),
  editorForm: document.querySelector("#editorForm"),
  editorCloseBtn: document.querySelector("#editorCloseBtn"),
  editorSaveBtn: document.querySelector("#editorSaveBtn"),
  editorConfirmBtn: document.querySelector("#editorConfirmBtn"),
  editorReasons: document.querySelector("#editorReasons"),
  editName: document.querySelector("#editName"),
  editStore: document.querySelector("#editStore"),
  editCategory: document.querySelector("#editCategory"),
  editStatus: document.querySelector("#editStatus"),
  editPrice: document.querySelector("#editPrice"),
  editOriginalPrice: document.querySelector("#editOriginalPrice"),
  editDiscount: document.querySelector("#editDiscount"),
  editQuantity: document.querySelector("#editQuantity"),
  editImages: document.querySelector("#editImages"),
  editImageSearch: document.querySelector("#editImageSearch"),
  imageGrid: document.querySelector("#imageGrid"),
  selectedImages: document.querySelector("#selectedImages"),
  imageCount: document.querySelector("#imageCount"),
  editDescription: document.querySelector("#editDescription"),
  editReady: document.querySelector("#editReady"),
};

let items = [];
let filter = "all";
let editingIndex = null;
let availableImages = [];
let editorImageSelection = [];

const sample = `Пате Ишим: 40%
улитка 2 шт
слойка творог 4 шт
фисташка малина 1 пор
лимон тарт макс 1

Пате Толе би
Безглютеновая галета с нектарином макси/мини 3480/1590 вместо 5800/2650

Туран
Банановые рогалики 1110тг вместо 1850тг 9уп
Круассаны 660тг вместо 1100тг 5 шт`;

function setStatus(text, tone = "idle") {
  els.status.textContent = text;
  els.status.dataset.tone = tone;
}

function money(value) {
  return typeof value === "number" ? `${value.toLocaleString("ru-RU")} ₸` : "нет";
}

function splitList(value) {
  return String(value || "")
    .split(/[\n,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function imageFileLabel(value) {
  return String(value || "").split("/").pop();
}

function numberValue(input, fallback = null) {
  if (input.value === "") return fallback;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function tomorrowDateValue() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function expiryDateTime() {
  if (!els.expiryDate.value) return null;
  return `${els.expiryDate.value}T21:00:00`;
}

function applyExpiryDate(cards) {
  const expiryDate = expiryDateTime();
  return cards.map((item) => ({
    ...item,
    expiryDate,
    expirationDate: expiryDate,
  }));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function syncImageInput() {
  els.editImages.value = editorImageSelection.join(", ");
}

function normalizeSelectionFromInput() {
  editorImageSelection = splitList(els.editImages.value);
}

function renderImagePicker() {
  const query = (els.editImageSearch?.value || "").trim().toLowerCase();
  const selectedSet = new Set(editorImageSelection);
  const images = availableImages.filter((file) => {
    if (!query) return true;
    return file.toLowerCase().includes(query);
  });

  els.imageCount.textContent = `${images.length}`;
  els.selectedImages.innerHTML = editorImageSelection.length
    ? editorImageSelection
        .map((file) => `<span class="image-chip">${escapeHtml(imageFileLabel(file))}<button type="button" data-remove-image="${escapeHtml(file)}" aria-label="Удалить ${escapeHtml(imageFileLabel(file))}">×</button></span>`)
        .join("")
    : `<span class="muted">Ничего не выбрано</span>`;

  els.imageGrid.innerHTML = images.length
    ? images
        .map((file) => {
          const selected = selectedSet.has(file);
          return `
            <button class="image-tile ${selected ? "selected" : ""}" type="button" data-image-file="${escapeHtml(file)}" title="${escapeHtml(file)}">
              <img src="images/${encodeURIComponent(file)}" alt="">
              <span>${escapeHtml(imageFileLabel(file))}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="empty-images">Ничего не найдено</div>`;
}

function imageCell(item) {
  const src = item.images?.[0] ? `/images/${item.images[0]}` : "";
  const image = src
    ? `<img class="thumb" src="${escapeHtml(src)}" alt="">`
    : `<div class="thumb"></div>`;
  const raw = item.rawLine_name || item.rawLine || "";
  return `
    <div class="product">
      ${image}
      <div>
        <div class="name">${escapeHtml(item.name || item.matchedCanonical || raw)}</div>
        <div class="raw">${escapeHtml(raw)}</div>
      </div>
    </div>
  `;
}

function reasonCell(item) {
  const reasons = item.reviewReasons || [];
  if (!reasons.length) return `<span class="muted">без замечаний</span>`;
  return `
    <div class="reason-list">
      ${reasons.map((reason) => `<span class="reason">${escapeHtml(reason)}</span>`).join("")}
    </div>
  `;
}

function render() {
  const visible = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (filter === "ok") return !item.needsReview;
      if (filter === "review") return item.needsReview;
      return true;
    });

  els.total.textContent = items.length;
  els.ok.textContent = items.filter((item) => !item.needsReview).length;
  els.review.textContent = items.filter((item) => item.needsReview).length;
  els.dryRunBtn.disabled = !items.length;
  els.sendCrmBtn.disabled = !items.some((item) => !item.needsReview);

  if (!visible.length) {
    els.body.innerHTML = `<tr class="empty"><td colspan="6">Нет позиций для этого фильтра.</td></tr>`;
    return;
  }

  els.body.innerHTML = visible
    .map(({ item, index }) => {
      const badge = item.needsReview
        ? `<span class="badge review">Проверить</span>`
        : `<span class="badge ok">Сделал сам</span>`;
      return `
        <tr class="item-row" data-index="${index}" tabindex="0" title="Открыть правку карточки">
          <td>${badge}</td>
          <td>${escapeHtml(item.storeName || "")}</td>
          <td>${imageCell(item)}</td>
          <td>${money(item.price)}<div class="raw">вместо ${money(item.originalPrice)}</div></td>
          <td>${escapeHtml(item.stockQuantity ?? 1)}</td>
          <td>${reasonCell(item)}</td>
        </tr>
      `;
    })
    .join("");
}

function openEditor(index) {
  const item = items[index];
  if (!item) return;

  editingIndex = index;
  els.editorTitle.textContent = item.name || item.matchedCanonical || item.rawLine_name || "Товар";
  els.editName.value = item.name || item.matchedCanonical || item.rawLine_name || "";
  els.editStore.value = item.storeName || "";
  els.editCategory.value = item.categoryName || "";
  els.editStatus.value = item.status || "AVAILABLE";
  els.editPrice.value = item.price ?? "";
  els.editOriginalPrice.value = item.originalPrice ?? "";
  els.editDiscount.value = item.discountPercentage ?? "";
  els.editQuantity.value = item.stockQuantity ?? 1;
  editorImageSelection = Array.isArray(item.images) ? [...item.images] : [];
  syncImageInput();
  els.editDescription.value = item.description || "";
  els.editReady.checked = !item.needsReview;

  const reasons = item.reviewReasons || [];
  els.editorReasons.innerHTML = reasons.length
    ? reasons.map((reason) => `<span class="reason">${escapeHtml(reason)}</span>`).join("")
    : `<span class="muted">Причин проверки нет</span>`;

  renderImagePicker();
  els.editor.showModal();
  els.editName.focus();
}

function closeEditor() {
  editingIndex = null;
  els.editor.close();
}

function saveEditor(confirmReady = false) {
  if (editingIndex === null || !items[editingIndex]) return;
  if (!els.editorForm.reportValidity()) return;

  const originalPrice = numberValue(els.editOriginalPrice);
  const price = numberValue(els.editPrice);
  let discountPercentage = numberValue(els.editDiscount, 0);
  if (price !== null && originalPrice) {
    discountPercentage = Math.round((1 - price / originalPrice) * 100);
  }

  const ready = confirmReady || els.editReady.checked;
  const previous = items[editingIndex];
  const reviewReasons = ready ? [] : previous.reviewReasons?.length ? previous.reviewReasons : ["ручная проверка"];
  const images = splitList(els.editImages.value);
  items[editingIndex] = {
    ...previous,
    name: els.editName.value.trim(),
    storeName: els.editStore.value.trim(),
    categoryName: els.editCategory.value.trim(),
    status: els.editStatus.value,
    price,
    originalPrice,
    discountPercentage,
    stockQuantity: numberValue(els.editQuantity, 1),
    images,
    description: els.editDescription.value.trim(),
    needsReview: !ready,
    reviewReasons,
    manuallyEdited: true,
  };

  items = applyExpiryDate(items);
  els.uploadReport.hidden = true;
  closeEditor();
  render();
  setStatus(ready ? "Карточка сохранена и готова к CRM" : "Карточка сохранена", "ok");
}

function renderUploadReport(data) {
  const summary = data.summary || {};
  const report = data.report || [];
  els.uploadReport.hidden = false;
  els.uploadReport.innerHTML = `
    <div class="upload-summary">
      <strong>${summary.dryRun ? "Проверка payload" : "Отправка в CRM"}</strong>
      <span>срок: ${escapeHtml(expiryDateTime() || "не указан")}</span>
      <span>готово: ${summary.ok ?? 0}</span>
      <span>пропущено: ${summary.skipped ?? 0}</span>
      <span>ошибок: ${summary.failed ?? 0}</span>
    </div>
    <div class="upload-lines">
      ${report
        .slice(0, 12)
        .map((item) => {
          const tone = item.result === "ok" || item.result === "dry-run" ? "ok" : item.result === "skipped" ? "skip" : "fail";
          return `<div class="upload-line ${tone}">
            <span>${escapeHtml(item.result)}</span>
            <strong>${escapeHtml(item.name || "")}</strong>
            <em>${escapeHtml(item.reason || item.response_text || "")}</em>
          </div>`;
        })
        .join("")}
    </div>
  `;
}

async function uploadToCrm(dryRun) {
  if (!items.length) {
    setStatus("Сначала обработай сообщение", "warn");
    return;
  }

  const readyCount = items.filter((item) => !item.needsReview).length;
  if (!dryRun && readyCount === 0) {
    setStatus("Нет готовых позиций для CRM", "warn");
    return;
  }

  els.dryRunBtn.disabled = true;
  els.sendCrmBtn.disabled = true;
  setStatus(dryRun ? "Проверяю payload..." : "Отправляю в CRM...", "busy");

  try {
    const response = await fetch("api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: applyExpiryDate(items), dryRun, force: false }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка CRM");
    renderUploadReport(data);
    const summary = data.summary;
    setStatus(
      dryRun
        ? `Payload готов: ${summary.ok} можно отправлять, ${summary.skipped} пропущено`
        : `CRM: ${summary.ok} создано, ${summary.skipped} пропущено, ${summary.failed} ошибок`,
      summary.failed ? "error" : "ok",
    );
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    render();
  }
}

async function parseMessage() {
  const text = els.input.value.trim();
  if (!text) {
    setStatus("Вставь сообщение", "warn");
    return;
  }

  els.parseBtn.disabled = true;
  setStatus("Обрабатываю...", "busy");

  try {
    const response = await fetch("api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Ошибка парсинга");
    items = applyExpiryDate(data.items || []);
    els.uploadReport.hidden = true;
    render();
    setStatus(`Готово: ${data.summary.ok} автоматически, ${data.summary.review} проверить`, "ok");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    els.parseBtn.disabled = false;
  }
}

els.parseBtn.addEventListener("click", parseMessage);
els.clearBtn.addEventListener("click", () => {
  els.input.value = "";
  items = [];
  els.uploadReport.hidden = true;
  render();
  setStatus("Готов к парсингу");
});
els.sampleBtn.addEventListener("click", () => {
  els.input.value = sample;
  els.input.focus();
});

els.expiryDate.value = tomorrowDateValue();
els.expiryDate.addEventListener("change", () => {
  items = applyExpiryDate(items);
  els.uploadReport.hidden = true;
});

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    filter = tab.dataset.filter;
    els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
    render();
  });
});

els.body.addEventListener("click", (event) => {
  const row = event.target.closest(".item-row");
  if (!row) return;
  openEditor(Number(row.dataset.index));
});

els.body.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest(".item-row");
  if (!row) return;
  event.preventDefault();
  openEditor(Number(row.dataset.index));
});

els.editorCloseBtn.addEventListener("click", closeEditor);
els.editorSaveBtn.addEventListener("click", () => saveEditor(false));
els.editorConfirmBtn.addEventListener("click", () => saveEditor(true));
els.editImages.addEventListener("input", () => {
  normalizeSelectionFromInput();
  renderImagePicker();
});
els.editImageSearch.addEventListener("input", renderImagePicker);
els.imageGrid.addEventListener("click", (event) => {
  const tile = event.target.closest("[data-image-file]");
  if (!tile) return;
  const file = tile.dataset.imageFile;
  const index = editorImageSelection.indexOf(file);
  if (index >= 0) {
    editorImageSelection.splice(index, 1);
  } else {
    editorImageSelection.push(file);
  }
  syncImageInput();
  renderImagePicker();
});
els.selectedImages.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-image]");
  if (!remove) return;
  const file = remove.dataset.removeImage;
  editorImageSelection = editorImageSelection.filter((entry) => entry !== file);
  syncImageInput();
  renderImagePicker();
});
els.editorForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveEditor(false);
});
els.editor.addEventListener("click", (event) => {
  if (event.target === els.editor) closeEditor();
});
els.editor.addEventListener("close", () => {
  editingIndex = null;
});

async function loadAvailableImages() {
  try {
    const response = await fetch("api/images");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось загрузить фото");
    availableImages = data.images || [];
    renderImagePicker();
  } catch (error) {
    availableImages = [];
    if (els.imageGrid) {
      els.imageGrid.innerHTML = `<div class="empty-images">${escapeHtml(error.message)}</div>`;
    }
  }
}

els.dryRunBtn.addEventListener("click", () => uploadToCrm(true));
els.sendCrmBtn.addEventListener("click", () => uploadToCrm(false));
loadAvailableImages();
