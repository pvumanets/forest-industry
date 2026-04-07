import { describe, expect, it } from "vitest";
import { parseValidationDetail } from "./parse422";

describe("parseValidationDetail", () => {
  it("строка detail → general", () => {
    const r = parseValidationDetail("Дата недели в теле запроса должна совпадать с датой в пути");
    expect(r.general).toBe(
      "Дата недели в теле запроса должна совпадать с датой в пути",
    );
    expect(Object.keys(r.fields).length).toBe(0);
  });

  it("массив с loc web_channels → ключ visitors_*", () => {
    const r = parseValidationDetail([
      {
        type: "value_error",
        loc: ["body", "web_channels", 1, "visitors"],
        msg: "Число посетителей должно быть целым числом",
      },
    ]);
    expect(r.fields.visitors_cpc_direct).toContain("посетителей");
  });

  it("reputation.cells → rep_* ключи", () => {
    const r = parseValidationDetail([
      {
        type: "value_error",
        loc: ["body", "reputation", "cells", 0, "rating"],
        msg: "Оценка должна быть от 0 до 5",
      },
    ]);
    expect(r.fields.rep_nov_2gis_rating).toBe("Оценка должна быть от 0 до 5");
  });

  it("cells у корня тела PUT /reputation → rep_* ключи", () => {
    const r = parseValidationDetail([
      {
        type: "value_error",
        loc: ["body", "cells", 0, "rating"],
        msg: "Оценка должна быть от 0 до 5",
      },
    ]);
    expect(r.fields.rep_nov_2gis_rating).toBe("Оценка должна быть от 0 до 5");
  });
});
