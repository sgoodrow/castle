import { ApplicationCommandOptionChoiceData } from "discord.js";
import { PublicSheetService } from "./sheet-updater/public-sheet";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import { truncate } from "lodash";

export interface ILocationService {
  getLocations(): Promise<GameLocation[]>;
  getLocationOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]>;
}

enum LOCATION_SPREADSHEET_COLUMNS {
  Name = "Name",
  Description = "Description",
}

export interface GameLocation {
  name: string;
  description: string;
}

export class LocationService implements ILocationService {
  private static _instance: LocationService;
  private sheetService: PublicSheetService;

  private locationCache = new LRUCache<string, GameLocation>({
    max: 200,
    ttl: 5 * MINUTES,
  });

  private constructor() {
    this.sheetService = new PublicSheetService();
  }

  public static getInstance() {
    if (!this._instance) {
      this._instance = new LocationService();
    }
    return this._instance;
  }

  async getLocations(): Promise<GameLocation[]> {
    this.locationCache.purgeStale();
    if (!this.locationCache.size) {
      // Reload data
      const rows = await this.sheetService.getLocationRows();
      for (const row of rows) {
        const location = {
          name: row[LOCATION_SPREADSHEET_COLUMNS.Name],
          description: row[LOCATION_SPREADSHEET_COLUMNS.Description],
        } as GameLocation;
        this.locationCache.set(location.name, location);
      }
    }
    return Array.from(this.locationCache.values());
  }

  async getLocationOptions(): Promise<
    ApplicationCommandOptionChoiceData<string>[]
  > {
    const locations = await this.getLocations();

    return locations.map((b) => ({
      name: truncate(`${b.name} - ${b.description}`, { length: 100 }),
      value: b.name,
    }));
  }
}
