import { ApplicationCommandOptionChoiceData } from "discord.js";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import { truncate } from "lodash";
import { publicSheetService } from "..";

export interface IRaidValuesService {
    getRaidValues(): Promise<RaidValue[]>;
    getRaidValueOptions(): Promise<ApplicationCommandOptionChoiceData<string>[]>;
}

enum RAID_VALUES_SPREADSHEET_COLUMNS {
    Target = "Target",
    Description = "Description",
    Tier = "Tier",
    KillDKP = "Kill DKP",
    BaseDKP = "Base DKP",
    RaceFTEBonus = "Race FTE Bonus*",
    CampFTEPickup = "Camp FTE Pickup",
    DirtyCleanTags = "Dirty/Clean Tags",
    RacingHourly = "Racing Hourly",
    RTEHourly = "RTE Hourly",
    TrackingHourly = "Tracking Hourly"
}

export interface RaidValue {
    target: string;
    description: string;
    tier: string;
    killDkp: number;
    baseDkp: number;
    raceFteBonus: number;
    campFteBonus: number;
    dirtyCleanTagBonus: number;
    racingHourly: number;
    rteHourly: number;
    trackingHourly: number;
}

export class RaidValuesService implements IRaidValuesService {
    private static _instance: RaidValuesService;

    private raidValueCache = new LRUCache<string, RaidValue>({
        max: 200,
        ttl: 5 * MINUTES,
    });

    private constructor() {

    }

    public static getInstance() {
        if (!this._instance) {
            this._instance = new RaidValuesService();
        }
        return this._instance;
    }

    async getRaidValues(): Promise<RaidValue[]> {
        try {
            this.raidValueCache.purgeStale();
            if (!this.raidValueCache.size) {
                // Reload data
                const rows = await publicSheetService.getRaidValueRows();
                let foundHeader = false;
                for (const row of rows) {
                    if (row[RAID_VALUES_SPREADSHEET_COLUMNS.BaseDKP] !== undefined) {
                        const raidValue = {
                            target: (row[RAID_VALUES_SPREADSHEET_COLUMNS.Target] as string).replace("*", ""),
                            description: row[RAID_VALUES_SPREADSHEET_COLUMNS.Description],
                            tier: row[RAID_VALUES_SPREADSHEET_COLUMNS.Tier],
                            killDkp: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.KillDKP]) || 0,
                            baseDkp: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.BaseDKP]) || 0,
                            raceFteBonus: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.RaceFTEBonus]) || 0,
                            campFteBonus: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.CampFTEPickup]) || 0,
                            dirtyCleanTagBonus: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.DirtyCleanTags]) || 0,
                            racingHourly: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.RaceFTEBonus]) || 0,
                            rteHourly: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.RTEHourly]) || 0,
                            trackingHourly: Number.parseFloat(row[RAID_VALUES_SPREADSHEET_COLUMNS.TrackingHourly]) || 0,

                        } as RaidValue;
                        this.raidValueCache.set(raidValue.target, raidValue);
                    }
                }
            }
            return Array.from(this.raidValueCache.values());
        } catch (err: unknown) {
            throw new Error("Failed to load raid values: " + err)
        }

    }

    async getRaidValue(target: string): Promise<RaidValue | undefined> {
        return this.raidValueCache.get(target);
    }

    async getRaidValueOptions(): Promise<
        ApplicationCommandOptionChoiceData<string>[]
    > {
        const raidValues = await this.getRaidValues();

        return raidValues.map((b) => ({
            name: truncate(`${b.description}`, { length: 100 }),
            value: b.target,
        })).sort((a, b) => a.value.localeCompare(b.value));
    }
}
