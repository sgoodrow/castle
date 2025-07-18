import { jest } from "@jest/globals";

export function createTypedMock<
  T extends (...args: any[]) => any
>(): jest.MockedFunction<T> {
  return jest.fn() as unknown as jest.MockedFunction<T>;
}

export function createTypedMockWithImplementation<
  T extends (...args: any[]) => any
>(implementation: (...args: any[]) => any): jest.MockedFunction<T> {
  return jest
    .fn()
    .mockImplementation(implementation) as unknown as jest.MockedFunction<T>;
}
