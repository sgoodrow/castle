import { SheetParser } from "./sheet-parser";

// lines from a real raid sheet, as sheet_to_csv emits them
const sheet = [
  '"[Fri Oct 09 08:21:26 2026] [ANONYMOUS] Aanger <Castle> {60 Ranger}"',
  '"[Fri Oct 09 08:21:26 2026] [ANONYMOUS] Astrale <Ancient Blood> {55 Monk}"',
  '"[Fri Oct 09 08:21:26 2026] [ANONYMOUS] Potasium <Castle> {55 Magician}"',
  '"[Fri Oct 09 08:21:26 2026] [ANONYMOUS] Vorn <Castle> {60 Shadow Knight}"',
  '"[Fri Oct 09 08:21:26 2026] [ANONYMOUS] Noclass <Castle>"',
  "\"[Fri Oct 09 08:21:31 2026] Moph tells you, 'creditt botpilot zapoy'\"",
];

describe("SheetParser", () => {
  const data = new SheetParser(sheet, 1, "2026.10.09 08.21.26 AM").data;

  it("reads attendees from /who lines", () => {
    expect(data.attendees).toEqual([
      "Aanger",
      "Astrale",
      "Potasium",
      "Vorn",
      "Noclass",
    ]);
  });

  it("reads classes from /who lines, including multi-word classes", () => {
    expect(data.classes).toEqual({
      Aanger: "Ranger",
      Astrale: "Monk",
      Potasium: "Magician",
      Vorn: "Shadow Knight",
    });
  });
});
