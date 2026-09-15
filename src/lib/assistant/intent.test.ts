import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/assistant/intent";

describe("parseIntent", () => {
  it("загальна сума витрат", () => {
    expect(parseIntent("скільки я витратила цього тижня").kind).toBe("total");
    expect(parseIntent("Скільки грошей пішло за місяць?").kind).toBe("total");
  });

  it("топ категорій", () => {
    expect(parseIntent("на що я витрачаю найбільше").kind).toBe("top_categories");
    expect(parseIntent("покажи топ категорій").kind).toBe("top_categories");
    expect(parseIntent("куди йдуть мої гроші").kind).toBe("top_categories");
  });

  it("найбільша покупка", () => {
    expect(parseIntent("яка була найбільша покупка").kind).toBe("biggest");
    expect(parseIntent("найдорожча витрата за місяць").kind).toBe("biggest");
  });

  it("нетипові покупки", () => {
    expect(parseIntent("чи були незвичні покупки").kind).toBe("unusual");
    expect(parseIntent("щось нетипове цього тижня?").kind).toBe("unusual");
    expect(parseIntent("дивні витрати").kind).toBe("unusual");
  });

  it("порівняння місяців", () => {
    expect(parseIntent("порівняй з минулим місяцем").kind).toBe("compare");
    expect(parseIntent("я стала більше витрачати?").kind).toBe("compare");
  });

  it("витрати в конкретній категорії", () => {
    const i = parseIntent("скільки я витратила на продукти");
    expect(i.kind).toBe("category");
    expect(i.category).toBe("Продукти");

    const j = parseIntent("а на кафе і ресторани цього місяця?");
    expect(j.kind).toBe("category");
    expect(j.category).toBe("Кафе і ресторани");
  });

  it("категорія за синонімом", () => {
    expect(parseIntent("скільки на таксі").category).toBe("Транспорт");
    expect(parseIntent("витрати на їжу").category).toBe("Продукти");
    expect(parseIntent("скільки на ліки").category).toBe("Здоровʼя");
  });

  it("кількість покупок", () => {
    expect(parseIntent("скільки разів я платила цього тижня").kind).toBe("count");
    expect(parseIntent("скільки покупок було").kind).toBe("count");
  });

  it("середній чек", () => {
    expect(parseIntent("який середній чек").kind).toBe("average");
    expect(parseIntent("середня покупка за місяць").kind).toBe("average");
  });

  it("надходження", () => {
    expect(parseIntent("скільки я отримала цього місяця").kind).toBe("income");
    expect(parseIntent("які були надходження").kind).toBe("income");
  });

  it("незрозуміле питання", () => {
    expect(parseIntent("яка погода завтра").kind).toBe("unknown");
    expect(parseIntent("привіт").kind).toBe("unknown");
  });
});
