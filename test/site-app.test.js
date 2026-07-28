import { describe, it, expect } from "vitest";
import {
  formatPrice,
  buildMenuViewModel,
  validateBooking,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  buildConfirmationMessage,
  CONTACT,
} from "../site/app.js";

const menu = [
  { id: "margherita", name: "Margherita", description: "Sos de roșii, mozzarella", price: 35 },
  { id: "hot", name: "Hot", description: "Salam picant", price: 45 },
];

describe("formatPrice", () => {
  it("appends lei", () => {
    expect(formatPrice(35)).toBe("35 lei");
  });
});

describe("buildMenuViewModel", () => {
  it("adds a priceLabel to every item", () => {
    const result = buildMenuViewModel(menu);
    expect(result).toEqual([
      { ...menu[0], priceLabel: "35 lei" },
      { ...menu[1], priceLabel: "45 lei" },
    ]);
  });
});

describe("validateBooking", () => {
  it("is invalid when date, name, and pizzas are all missing", () => {
    const { valid, errors } = validateBooking({ date: "", name: "", selections: [] });
    expect(valid).toBe(false);
    expect(errors.date).toBeTruthy();
    expect(errors.name).toBeTruthy();
    expect(errors.pizzas).toBeTruthy();
  });

  it("is invalid when no pizza has a quantity above zero", () => {
    const { valid, errors } = validateBooking({
      date: "2026-08-01",
      name: "Ana",
      selections: [],
    });
    expect(valid).toBe(false);
    expect(errors.pizzas).toBeTruthy();
    expect(errors.date).toBeUndefined();
    expect(errors.name).toBeUndefined();
  });

  it("is valid when date, name, and at least one pizza quantity are present", () => {
    const { valid, errors } = validateBooking({
      date: "2026-08-01",
      name: "Ana",
      selections: [{ id: "margherita", qty: 2 }],
    });
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });
});

describe("buildWhatsAppMessage", () => {
  it("includes all fields and the selected pizzas with quantities and unit prices", () => {
    const message = buildWhatsAppMessage(
      {
        name: "Ana",
        date: "2026-08-01",
        location: "Cluj",
        guests: "30",
        notes: "Lângă lac",
        selections: [
          { id: "margherita", qty: 3 },
          { id: "hot", qty: 2 },
        ],
      },
      menu
    );

    expect(message).toContain("Nume: Ana");
    expect(message).toContain("Data eveniment: 2026-08-01");
    expect(message).toContain("Locație: Cluj");
    expect(message).toContain("Nr. persoane: 30");
    expect(message).toContain("3 x Margherita (35 lei/buc)");
    expect(message).toContain("2 x Hot (45 lei/buc)");
    expect(message).toContain("Observații: Lângă lac");
  });

  it("falls back to a dash for optional empty fields", () => {
    const message = buildWhatsAppMessage(
      {
        name: "Ana",
        date: "2026-08-01",
        location: "",
        guests: "",
        notes: "",
        selections: [{ id: "hot", qty: 1 }],
      },
      menu
    );

    expect(message).toContain("Locație: -");
    expect(message).toContain("Nr. persoane: -");
    expect(message).toContain("Observații: -");
  });
});

describe("buildWhatsAppUrl", () => {
  it("targets the business phone number and URL-encodes the message", () => {
    const url = buildWhatsAppUrl("Bună Anda!");
    expect(url).toBe(`https://wa.me/${CONTACT.phoneIntl}?text=${encodeURIComponent("Bună Anda!")}`);
    expect(url.startsWith("https://wa.me/40756748177?text=")).toBe(true);
  });
});

describe("buildConfirmationMessage", () => {
  it("says WhatsApp opened, not that the message was sent", () => {
    const message = buildConfirmationMessage();
    expect(message).toContain("deschis WhatsApp");
    expect(message.toLowerCase()).not.toContain("trimis mesajul");
  });
});
