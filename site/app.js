// And'a Pizza site logic. Pure functions below are unit tested from
// test/site-app.test.js; the DOM wiring at the bottom only runs in a browser.

const PHONE_INTL = "40756748177";
const PHONE_DISPLAY = "+40 756 748 177";

/**
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  return `${price} lei`;
}

/**
 * Map raw menu entries to a view model with a display-ready price label.
 * @param {Array<{id: string, name: string, description: string, price: number}>} menu
 */
export function buildMenuViewModel(menu) {
  return menu.map((item) => ({ ...item, priceLabel: formatPrice(item.price) }));
}

/**
 * Validate the booking form. `date` and `name` are required, along with at
 * least one pizza selection with a quantity of 1 or more.
 * @param {{date: string, name: string, selections: Array<{id: string, qty: number}>}} formState
 * @returns {{valid: boolean, errors: {date?: string, name?: string, pizzas?: string}}}
 */
export function validateBooking({ date, name, selections }) {
  const errors = {};

  if (!date || !date.trim()) {
    errors.date = "Te rugăm să alegi data evenimentului.";
  }
  if (!name || !name.trim()) {
    errors.name = "Te rugăm să introduci numele tău.";
  }
  if (!selections || !selections.some((selection) => selection.qty > 0)) {
    errors.pizzas = "Alege cel puțin o pizza și o cantitate.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Build the Romanian WhatsApp inquiry message from the booking form state.
 * Lists quantity and unit price per pizza; Anda totals the order herself.
 * @param {{name: string, date: string, location: string, guests: string, notes: string, selections: Array<{id: string, qty: number}>}} formState
 * @param {Array<{id: string, name: string, price: number}>} menu
 * @returns {string}
 */
export function buildWhatsAppMessage({ name, date, location, guests, notes, selections }, menu) {
  const pizzaList = selections
    .filter((selection) => selection.qty > 0)
    .map((selection) => {
      const item = menu.find((menuItem) => menuItem.id === selection.id);
      return `${selection.qty} x ${item.name} (${formatPrice(item.price)}/buc)`;
    })
    .join(", ");

  return [
    "Bună Anda! Aș dori să fac o rezervare pentru un eveniment.",
    `Nume: ${name}`,
    `Data eveniment: ${date}`,
    `Locație: ${location && location.trim() ? location : "-"}`,
    `Nr. persoane: ${guests && guests.trim() ? guests : "-"}`,
    `Pizza dorite: ${pizzaList || "-"}`,
    `Observații: ${notes && notes.trim() ? notes : "-"}`,
  ].join("\n");
}

/**
 * @param {string} message
 * @returns {string}
 */
export function buildWhatsAppUrl(message) {
  return `https://wa.me/${PHONE_INTL}?text=${encodeURIComponent(message)}`;
}

/**
 * Confirmation shown after WhatsApp opens. Says "opened", not "sent" — the
 * customer still has to press send inside WhatsApp.
 * @returns {string}
 */
export function buildConfirmationMessage() {
  return "Am deschis WhatsApp cu mesajul completat. Apasă Trimite acolo ca să ajungă la Anda.";
}

export const CONTACT = { phoneIntl: PHONE_INTL, phoneDisplay: PHONE_DISPLAY };

if (typeof document !== "undefined") {
  const menuListEl = document.getElementById("menu-list");
  const formEl = document.getElementById("booking-form");
  const errorsEl = document.getElementById("form-errors");
  const successEl = document.getElementById("form-success");
  const phoneLinkEl = document.getElementById("phone-link");
  const whatsappSubmitEl = document.getElementById("whatsapp-submit");

  if (phoneLinkEl) {
    phoneLinkEl.href = `tel:${PHONE_DISPLAY.replace(/\s+/g, "")}`;
    phoneLinkEl.textContent = PHONE_DISPLAY;
  }

  fetch("./data/menu.json")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((menu) => {
      renderMenu(menu);
      wireForm(menu);
    })
    .catch(() => {
      if (menuListEl) {
        menuListEl.innerHTML =
          '<p class="menu-error">Nu am putut încărca meniul. Deschide site-ul printr-un server local (ex: <code>npx serve site</code>) sau reîncarcă pagina.</p>';
      }
    });

  function renderMenu(menu) {
    if (!menuListEl) return;
    const items = buildMenuViewModel(menu);
    menuListEl.innerHTML = items
      .map(
        (item) => `
        <li class="menu-item" data-pizza-id="${item.id}">
          ${item.image ? `<img class="menu-item__image" src="${item.image}" alt="${item.name}" width="72" height="72" />` : ""}
          <div class="menu-item__body">
            <div class="menu-item__header">
              <span class="menu-item__name">${item.name}</span>
              <span class="menu-item__price">${item.priceLabel}</span>
            </div>
            <p class="menu-item__description">${item.description}</p>
            <div class="menu-item__select">
              <label class="menu-item__checkbox-label">
                <input type="checkbox" class="menu-item__box" value="${item.id}" />
                Adaugă la rezervare
              </label>
              <input
                type="number"
                class="menu-item__qty"
                min="1"
                value="1"
                disabled
                aria-label="Cantitate ${item.name}"
              />
            </div>
          </div>
        </li>`
      )
      .join("");

    menuListEl.querySelectorAll(".menu-item").forEach((row) => {
      const checkbox = row.querySelector(".menu-item__box");
      const qtyInput = row.querySelector(".menu-item__qty");
      checkbox.addEventListener("change", () => {
        qtyInput.disabled = !checkbox.checked;
        if (checkbox.checked && (!qtyInput.value || Number(qtyInput.value) < 1)) {
          qtyInput.value = "1";
        }
      });
    });
  }

  function gatherPizzaSelections() {
    if (!menuListEl) return [];
    return Array.from(menuListEl.querySelectorAll(".menu-item"))
      .filter((row) => row.querySelector(".menu-item__box").checked)
      .map((row) => {
        const id = row.querySelector(".menu-item__box").value;
        const qty = parseInt(row.querySelector(".menu-item__qty").value, 10);
        return { id, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 };
      });
  }

  function wireForm(menu) {
    if (!formEl || !whatsappSubmitEl) return;
    // A real link click, left to the browser's own default navigation, opens
    // reliably in far more browsers and sandboxed embeds than a script-driven
    // window.open() — which popup blockers and iframe sandboxes can silently
    // swallow. So the anchor's href is set here, and only invalid submissions
    // call preventDefault(); a valid one lets the click's default action run.
    whatsappSubmitEl.addEventListener("click", (event) => {
      const data = new FormData(formEl);
      const formState = {
        name: data.get("name") || "",
        date: data.get("date") || "",
        location: data.get("location") || "",
        guests: data.get("guests") || "",
        notes: data.get("notes") || "",
        selections: gatherPizzaSelections(),
      };

      const { valid, errors } = validateBooking(formState);

      if (!valid) {
        event.preventDefault();
        if (errorsEl) {
          errorsEl.innerHTML = Object.values(errors)
            .map((message) => `<p class="form-error">${message}</p>`)
            .join("");
        }
        if (successEl) successEl.textContent = "";
        return;
      }

      if (errorsEl) errorsEl.innerHTML = "";

      const message = buildWhatsAppMessage(formState, menu);
      whatsappSubmitEl.href = buildWhatsAppUrl(message);

      if (successEl) successEl.textContent = buildConfirmationMessage();
    });
  }
}
