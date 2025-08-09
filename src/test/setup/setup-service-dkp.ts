/**
 * DKP service mocking utilities for tests
 */

jest.mock("../../services/castledkp", () => ({
  CastleDkpService: class {
    async getDkp() {
      return [];
    }
    async getDkpForPlayer() {
      return [];
    }
  },
}));

jest.mock("../../services/betaDkpService", () => ({
  BetaDkpService: class {
    async getDkp() {
      return [];
    }
    async getDkpForPlayer() {
      return [];
    }
  },
}));
