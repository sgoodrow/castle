import { Day } from "../features/bank-request-info/types";
import { BankHour } from "./bank-hour";

jest.useFakeTimers().setSystemTime(new Date(Date.UTC(2020, 0))); // Wednesday

describe("bank hour", () => {
  test.each([
    [Day.Wednesday, 0, "Wed, 01 Jan 2020 00:00:00 GMT"],
    [Day.Wednesday, 6, "Wed, 01 Jan 2020 06:00:00 GMT"],
    [Day.Wednesday, 23, "Wed, 01 Jan 2020 23:00:00 GMT"],
    [Day.Wednesday, 24, "Thu, 02 Jan 2020 00:00:00 GMT"],
    [Day.Thursday, 0, "Thu, 02 Jan 2020 00:00:00 GMT"],
    [Day.Thursday, 12, "Thu, 02 Jan 2020 12:00:00 GMT"],
    [Day.Thursday, 24, "Fri, 03 Jan 2020 00:00:00 GMT"],
    [Day.Tuesday, 3, "Tue, 07 Jan 2020 03:00:00 GMT"],
  ])("bank hour %s, %i", (day, hour, expected) => {
    const a = new BankHour();
    a.day = day;
    a.hour = hour;
    expect(a.nextBankerHour.toUTCString()).toBe(expected);
  });
});
