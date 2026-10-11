import { EmbedBuilder } from "discord.js";
import { countBy, sumBy } from "lodash";
import moment, { Moment } from "moment";
import { castledkp, RaidEventData } from "../../services/castledkp";
import { code } from "../../shared/util";
import { CreditData } from "./create/credit-parser";
import { LootData } from "./raid-report";
import { openDkpClientName } from "../../config";
import { RaidValue } from "../../services/raidValuesService";

export const UPLOAD_DATE_FORMAT = "YYYY-MM-DD HH:mm";
export const EVERYONE = "Everyone";

export interface AdjustmentData {
    player: string;
    value: number;
    reason: string;
}

export interface RaidTickData {
    finished: boolean;
    tickNumber: number;
    sheetName: string;
    value?: number;
    event?: RaidValue;
    eqdkpEvent?: RaidEventData;
    note?: string;
    loot: LootData[];
    attendees: string[];
    date: string;
    credits: CreditData[];
    adjustments?: AdjustmentData[];
    // attendee -> the character they replaced via !rep, e.g. a botpilot's bot
    replaced?: { [attendee: string]: string };
    // attendee -> class, from the /who line in the sheet
    classes?: { [attendee: string]: string };
}

interface Change {
    person: string;
    change: string;
    reason: string;
}

const CLASS_ABBREVIATIONS: { [cls: string]: string } = {
    bard: "BRD",
    beastlord: "BST",
    berserker: "BER",
    cleric: "CLR",
    druid: "DRU",
    enchanter: "ENC",
    mage: "MAG",
    magician: "MAG",
    monk: "MNK",
    necromancer: "NEC",
    paladin: "PAL",
    ranger: "RNG",
    rogue: "ROG",
    shadowknight: "SHD",
    shaman: "SHM",
    warrior: "WAR",
    wizard: "WIZ",
};

const abbreviateClass = (cls?: string) => {
    if (!cls) {
        return "?";
    }
    const key = cls.toLowerCase().replace(/[^a-z]/g, "");
    return CLASS_ABBREVIATIONS[key] || key.slice(0, 3).toUpperCase() || "?";
};

export const getRaidUrl = (eventUrlSlug: string, raidId: number) =>
    `https://${openDkpClientName}.opendkp.com/#/raids/${raidId}`;

export class RaidTick {
    public constructor(public readonly data: RaidTickData) { }

    public get hasEvent(): boolean {
        return !!this.data.event;
    }

    private get date(): Moment {
        return moment(this.data.date);
    }

    public get shortDateTime(): string {
        return this.date.format("M-D H:mm");
    }
    public get shortDate(): string {
        return this.date.format("M-D");
    }
    public get eventAbreviation(): string {
        return this.data.event?.target || "";
    }
    public get eqDkpEventAbreviation(): string {
        return this.data.eqdkpEvent?.abreviation || "";
    }

    // todo maybe truncate this with ellipses based on param (for raid reports, since note can be long)
    public get name(): string {
        return `${this.data.finished ? "✅ " : ""}${this.shortDateTime} ${this.eventAbreviation || this.data.sheetName
            } ${this.data.tickNumber}${this.note}`;
    }
    public get uploadNote(): string {
        return `${this.data.finished ? "✅ " : ""}${this.shortDate} ${this.eventAbreviation || this.data.sheetName
            } ${this.data.tickNumber}${this.note}`;
    }
    public get note(): string {
        return this.data.note ? ` (${this.data.note})` : "";
    }

    public get earned(): number {
        const adjustments = sumBy(this.data.adjustments, ({ value }) => value);
        return this.data.value === undefined
            ? 0 + adjustments
            : this.data.attendees.length * this.data.value + adjustments;
    }

    public get uploadDate(): string {
        return this.date.format(UPLOAD_DATE_FORMAT);
    }

    public get spent(): number {
        return sumBy(this.data.loot, (l) => l.price);
    }

    public async uploadAsRaid(threadUrl: string) {
        if (this.data.finished) {
            throw new Error(`${this.name} has already been uploaded.`);
        }
        const response = await castledkp.createRaidFromTick(this, threadUrl);
        this.data.finished = true;
        return response;
    }

    public addAdjustment(adjustment: AdjustmentData) {
        if (!this.data.adjustments) {
            this.data.adjustments = [];
        }
        this.data.adjustments.push(adjustment);
    }

    public hasPlayer(name: string): boolean {
        return this.indexOfPlayer(name) >= 0;
    }

    private indexOfPlayer(name: string): number {
        const lower = name.toLowerCase();
        return this.data.attendees.findIndex((a) => a.toLowerCase() === lower);
    }

    public addPlayer(name: string) {
        if (!this.hasPlayer(name)) {
            this.data.attendees.push(name);
            this.data.attendees.sort();
        }
    }

    /** Returns false if the player was not in attendance. */
    public removePlayer(name: string): boolean {
        const index = this.indexOfPlayer(name);
        if (index < 0) {
            return false;
        }
        const [removed] = this.data.attendees.splice(index, 1);
        if (this.data.replaced) {
            delete this.data.replaced[removed];
        }
        return true;
    }

    /** Returns false if the replaced player was not in attendance. */
    public replacePlayer(replacer: string, replaced: string): boolean {
        const index = this.indexOfPlayer(replaced);
        if (index < 0) {
            return false;
        }
        const original = this.data.attendees[index];
        // keep the first character in a chain of replacements, e.g. the bot
        const replacedBy = this.data.replaced?.[original] ?? original;
        this.removePlayer(original);
        this.addPlayer(replacer);
        this.data.replaced = { ...this.data.replaced, [replacer]: replacedBy };
        return true;
    }

    /** The character this attendee replaced via !rep, if any. */
    public getReplaced(attendee: string): string | undefined {
        return this.data.replaced?.[attendee];
    }

    public update(event: RaidValue, value: number, note?: string, eqDkpEvent?: RaidEventData) {
        this.data.event = event;
        this.data.eqdkpEvent = eqDkpEvent;
        this.data.value = value;
        this.data.note = note;
    }

    public renderTick(
        firstColumnLength: number,
        secondColumnLength: number,
        getClass?: (name: string) => string | undefined
    ) {
        const ready =
            this.data.value !== undefined && this.data.event !== undefined;
        const all = EVERYONE.padEnd(firstColumnLength);
        const attendanceValue = `${this.getPaddedDkp(
            secondColumnLength,
            this.data.value === undefined ? "+?" : `+${this.data.value}`
        )}`;
        const changes: Change[] = [
            ...this.data.loot.map((l) => ({
                person: l.buyer,
                change: `-${l.price}`,
                reason: l.item,
            })),
            ...(this.data.adjustments || []).map((a) => ({
                person: a.player,
                change: `+${a.value}`,
                reason: a.reason,
            })),
        ];
        const change =
            changes.length > 0
                ? `\n${this.renderChanges(
                    changes,
                    firstColumnLength,
                    secondColumnLength
                )}`
                : "";
        const classes = getClass ? `\n${this.renderClasses(getClass)}` : "";
        return `--- ${this.name} ---
${ready ? "+" : "-"} ${all} ${attendanceValue} (Attendance)${classes}${change}`;
    }

    public renderClasses(getClass: (name: string) => string | undefined): string {
        // a botpilot's main isn't in the raid, their bot is, so count the bot's class
        const counts = countBy(this.data.attendees, (a) =>
            abbreviateClass(getClass(this.getReplaced(a) ?? a))
        );
        const summary = Object.entries(counts)
            .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
            .map(([cls, count]) => `${cls} ${count}`)
            .join(" · ");
        return `  ${summary || "No attendees"}`;
    }

    public getCreatedEmbed(
        eventUrlSlug: string,
        id: number,
        invalidNames: string[]
    ): EmbedBuilder {
        const net = this.earned - this.spent;
        const result =
            net === 0
                ? "No change to economy"
                : net > 0
                    ? `+ Economy increase     ${net}`
                    : `- Economy decrease     ${net}`;
        const notIncluded =
            invalidNames.length > 0
                ? `These characters were not included because they do not exist ${invalidNames.join(
                    ", "
                )}`
                : "";
        return new EmbedBuilder({
            title: `${this.name}`,
            description: `${code}diff
DKP Earned             ${this.earned}
DKP Spent              ${this.spent}
-------------------------------
${result}${code}${notIncluded}`,
            url: getRaidUrl(eventUrlSlug, id),
        });
    }

    private renderChanges(
        changes: Change[],
        firstColumnLength: number,
        secondColumnLength: number
    ): string {
        return changes
            .sort((a, b) => a.person.localeCompare(b.person))
            .map((c) => this.renderChange(c, firstColumnLength, secondColumnLength))
            .join("\n");
    }

    private renderChange(
        { person, change, reason }: Change,
        firstColumnLength: number,
        secondColumnLength: number
    ) {
        return `+ ${person.padEnd(firstColumnLength)} ${this.getPaddedDkp(
            secondColumnLength,
            change
        )} (${reason})`;
    }

    public get creditCommands(): string[] {
        const tick = this.data.tickNumber;
        const attendees = new Set(this.data.attendees.map((a) => a.toLowerCase()));
        return this.data.credits.flatMap((c) => {
            if (c.type === "UNKNOWN") {
                return [`⚠️ Unparsable credit: ${c.character} said '${c.raw}' during Raid Tick ${tick}`];
            }
            if (c.type === "REASON") {
                return [`!add ${c.character} ${tick} (${c.reason})`];
            }
            if (attendees.has(c.pilot.toLowerCase())) {
                // swapping the bot for the pilot would credit the pilot twice, so leave it to a deputy
                return [`⚠️ ${c.character} said botpilot ${c.pilot} during Raid Tick ${tick}, but ${c.pilot} is already in attendance`];
            }
            const rep = `!rep ${c.character} with ${c.pilot} ${tick}${c.reason ? ` (${c.reason})` : ""}`;
            // a !rep only swaps someone already in attendance, so a bot that was out of
            // zone has to be added first or the pilot silently gets no credit
            const bot = c.character.toLowerCase();
            if (attendees.has(bot)) {
                return [rep];
            }
            attendees.add(bot);
            return [`!add ${c.character} ${tick} (botpilot, not in attendance)`, rep];
        });
    }

    private getPaddedDkp(secondColumnLength: number, value: string) {
        return value.padEnd(secondColumnLength);
    }
}
