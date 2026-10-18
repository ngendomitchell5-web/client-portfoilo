const STORAGE_KEY = "market-list-items-v1";

const form = document.querySelector("#add-form");
const nameInput = document.querySelector("#item-name");
const priceInput = document.querySelector("#item-price");
const itemList = document.querySelector("#item-list");
const emptyState = document.querySelector("#empty-state");
const itemCount = document.querySelector("#item-count");
const totalCost = document.querySelector("#total-cost");
const markButton = document.querySelector("#mark-purchased");
const clearButton = document.querySelector("#clear-list");

function loadItems() {
  try {
    const storedItems = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(storedItems)) return [];
    return storedItems.filter((item) => item && typeof item.name === "string").map((item) => ({
      id: String(item.id || crypto.randomUUID()),
      name: item.name.slice(0, 80),
      price: Number.isFinite(Number(item.price)) && Number(item.price) >= 0 ? Number(item.price) : 0,
      purchased: Boolean(item.purchased),
      selected: Boolean(item.selected),
    }));
  } catch {
    return [];
  }
}

let items = loadItems();

function saveItems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // The app remains usable when browser storage is unavailable.
  }
}

function makeButton(label, symbol, className, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${className}`;
  button.dataset.action = action;
  button.dataset.id = id;
  button.setAttribute("aria-label", `${label} item`);
  button.title = `${label} item`;
  button.textContent = symbol;
  return button;
}

function render() {
  itemList.replaceChildren();

  for (const item of items) {
    const row = document.createElement("li");
    row.className = `item-row${item.purchased ? " purchased" : ""}`;
    row.dataset.id = item.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-select";
    checkbox.checked = item.selected;
    checkbox.dataset.action = "select";
    checkbox.dataset.id = item.id;
    checkbox.setAttribute("aria-label", `Select ${item.name} to mark purchased`);

    const name = document.createElement("button");
    name.type = "button";
    name.className = "item-name item-toggle";
    name.dataset.action = "toggle";
    name.dataset.id = item.id;
    name.textContent = item.name;
    name.setAttribute("aria-pressed", String(item.purchased));
    name.title = item.purchased ? "Mark as not purchased" : "Mark as purchased";

    const price = document.createElement("span");
    price.className = "item-price";
    price.textContent = `$${item.price.toFixed(2)}`;

    const actions = document.createElement("span");
    actions.className = "item-actions";
    actions.append(makeButton("Edit", "✎", "edit", "edit", item.id));
    actions.append(makeButton("Remove", "×", "delete", "delete", item.id));

    row.append(checkbox, name, price, actions);
    itemList.append(row);
  }

  const count = items.length;
  const selectedCount = items.filter((item) => item.selected && !item.purchased).length;
  const purchasedTotal = items.reduce((sum, item) => sum + (item.purchased ? item.price : 0), 0);
  itemCount.textContent = `${count} ${count === 1 ? "item" : "items"}`;
  totalCost.textContent = `$${purchasedTotal.toFixed(2)}`;
  emptyState.classList.toggle("visible", count === 0);
  itemList.hidden = count === 0;
  markButton.disabled = selectedCount === 0;
  clearButton.disabled = count === 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }
  const enteredPrice = priceInput.value.trim();
  const price = enteredPrice === "" ? 0 : Number(enteredPrice);
  if (!Number.isFinite(price) || price < 0) {
    priceInput.focus();
    return;
  }

  items.push({ id: crypto.randomUUID(), name, price, purchased: false, selected: false });
  saveItems();
  render();
  form.reset();
  nameInput.focus();
});

itemList.addEventListener("change", (event) => {
  if (event.target.matches('[data-action="select"]')) {
    const item = items.find((entry) => entry.id === event.target.dataset.id);
    if (item) {
      item.selected = event.target.checked;
      saveItems();
      render();
    }
  }
});

itemList.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const { action, id } = control.dataset;
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  if (action === "toggle") {
    item.purchased = !item.purchased;
    item.selected = false;
  } else if (action === "delete") {
    items = items.filter((entry) => entry.id !== id);
  } else if (action === "edit") {
    openEditor(item);
    return;
  } else {
    return;
  }
  saveItems();
  render();
});

function openEditor(item) {
  const row = itemList.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
  if (!row) return;
  const editor = document.createElement("form");
  editor.className = "inline-editor";
  editor.setAttribute("aria-label", `Edit ${item.name}`);

  const nameField = document.createElement("input");
  nameField.type = "text";
  nameField.maxLength = 80;
  nameField.required = true;
  nameField.value = item.name;
  nameField.setAttribute("aria-label", "Item name");

  const priceField = document.createElement("input");
  priceField.type = "number";
  priceField.min = "0";
  priceField.step = "0.01";
  priceField.value = item.price.toFixed(2);
  priceField.setAttribute("aria-label", "Item price");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "editor-save";
  saveButton.textContent = "Save";
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "editor-cancel";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", render);
  editor.append(nameField, priceField, saveButton, cancelButton);

  row.querySelector(".item-name").replaceWith(editor);
  row.querySelector(".item-price").hidden = true;
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameField.value.trim();
    const price = Number(priceField.value);
    if (!name || !Number.isFinite(price) || price < 0) return;
    item.name = name;
    item.price = price;
    saveItems();
    render();
  });
  nameField.focus();
  nameField.select();
}

markButton.addEventListener("click", () => {
  for (const item of items) {
    if (item.selected) item.purchased = true;
    item.selected = false;
  }
  saveItems();
  render();
});

clearButton.addEventListener("click", () => {
  items = [];
  saveItems();
  render();
  nameInput.focus();
});

render();
