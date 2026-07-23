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
 * least one selected pizza.
 * @param {{date: string, name: string, pizzaIds: string[]}} formState
 * @returns {{valid: boolean, errors: {date?: string, name?: string, pizzas?: string}}}
 */
export function validateBooking({ date, name, pizzaIds }) {
  const errors = {};

  if (!date || !date.trim()) {
    errors.date = "Te rugăm să alegi data evenimentului.";
  }
  if (!name || !name.trim()) {
    errors.name = "Te rugăm să introduci numele tău.";
  }
  if (!pizzaIds || pizzaIds.length === 0) {
    errors.pizzas = "Alege cel puțin o pizza.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Build the Romanian WhatsApp inquiry message from the booking form state.
 * @param {{name: string, date: string, location: string, guests: string, notes: string, pizzaIds: string[]}} formState
 * @param {Array<{id: string, name: string, price: number}>} menu
 * @returns {string}
 */
export function buildWhatsAppMessage({ name, date, location, guests, notes, pizzaIds }, menu) {
  const chosen = menu.filter((item) => pizzaIds.includes(item.id));
  const pizzaList = chosen.map((item) => `${item.name} (${formatPrice(item.price)})`).join(", ");

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

export const CONTACT = { phoneIntl: PHONE_INTL, phoneDisplay: PHONE_DISPLAY };

if (typeof document !== "undefined") {
  const menuListEl = document.getElementById("menu-list");
  const pizzaChecklistEl = document.getElementById("pizza-checklist");
  const formEl = document.getElementById("booking-form");
  const errorsEl = document.getElementById("form-errors");
  const phoneLinkEl = document.getElementById("phone-link");

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
      renderPizzaChecklist(menu);
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
        <li class="menu-item">
          <div class="menu-item__header">
            <span class="menu-item__name">${item.name}</span>
            <span class="menu-item__price">${item.priceLabel}</span>
          </div>
          <p class="menu-item__description">${item.description}</p>
        </li>`
      )
      .join("");
  }

  function renderPizzaChecklist(menu) {
    if (!pizzaChecklistEl) return;
    const items = buildMenuViewModel(menu);
    pizzaChecklistEl.innerHTML = items
      .map(
        (item) => `
        <label class="pizza-check">
          <input type="checkbox" name="pizza" value="${item.id}" />
          <span>${item.name} — ${item.priceLabel}</span>
        </label>`
      )
      .join("");
  }

  function wireForm(menu) {
    if (!formEl) return;
    formEl.addEventListener("submit", (event) => {
      event.preventDefault();

      const data = new FormData(formEl);
      const formState = {
        name: data.get("name") || "",
        date: data.get("date") || "",
        location: data.get("location") || "",
        guests: data.get("guests") || "",
        notes: data.get("notes") || "",
        pizzaIds: data.getAll("pizza"),
      };

      const { valid, errors } = validateBooking(formState);

      if (!valid) {
        if (errorsEl) {
          errorsEl.innerHTML = Object.values(errors)
            .map((message) => `<p class="form-error">${message}</p>`)
            .join("");
        }
        return;
      }

      if (errorsEl) errorsEl.innerHTML = "";

      const message = buildWhatsAppMessage(formState, menu);
      const url = buildWhatsAppUrl(message);
      window.open(url, "_blank", "noopener");
    });
  }
}
