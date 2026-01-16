import axios, { AxiosRequestConfig } from "axios";
import { RaidTick } from "../features/dkp-records/raid-tick";
import moment from "moment";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import {
  capitalize,
  convertClass,
  convertRace,
  decodeHtmlEntities,
  processTsvFileWithHeaders,
  RowObject,
  toSentenceCase,
} from "../shared/util";
import fs from "fs";
import { env } from "process";
import {
  openDkpUsername,
  openDkpPassword,
  openDkpAuthClientId,
  openDkpClientName,
  openDkpAuctionRaidId,
} from "../config";

// Client for OpenDKP

interface IAccessTokenResult {
  AccessToken: string;
  ExpiresIn: number;
  IdToken: string;
  RefreshToken: string;
  TokenType: string;
}

export interface ODKPRaidItem {
  CharacterName: string;
  Dkp: number;
  GameItemId: number;
  ItemId: number;
  ItemName: string;
  Notes: string;
}

export interface ODKPItemSearchResponse {
  items: ODKPItemResponse[];
}

export interface ODKPRaidTickCharacter {
  Name: string;
}

export interface ODKPRaidTick {
  Characters: ODKPRaidTickCharacter[];
  Description: string;
  Value: number;
}

export interface ODKPRaidPool {
  Description: string;
  Name: string;
  PoolId: number;
}

export interface ODKPRaidData {
  Attendance: number;
  Items: ODKPRaidItem[];
  Name: string;
  Pool: ODKPRaidPool;
  Ticks: ODKPRaidTick[];
  Timestamp: string;
  Version?: number;
  ClientId?: string;
  RaidId?: number;
}

export interface ODKPUpdateRaidData {
  ClientId: string;
  RaidId: string;
  Attendance: number;
  Items: ODKPRaidItem[];
  Name: string;
  Pool: ODKPRaidPool;
  Ticks: ODKPRaidTick[];
  Timestamp: string;
  Version: number;
}

export interface ODKPItemResponse {
  ItemID: number;
  ItemName: string;
  GameItemId: number;
}

export interface ODKPItemDbItem {
  ItemId: number;
  Name: string;
  GameItemId: number;
}

export interface ODKPAdjustment {
  Name: string;
  Description: string;
  Value: number;
  Character: ODKPRaidTickCharacter;
  Timestamp: string;
}

interface ODKPCharacterData {
  ClientId: string;
  CharacterId: number;
  AssociatedId: number;
  Active: number;
  Name: string;
  Rank: string;
  Class: string;
  Level: number;
  Race: string;
  Gender: string;
  Guild: string;
  MainChange: string; // ISO date string
  Deleted: number;
  User: string;
  CreatedDate: string; // ISO date string
  ParentId: number;
}

export interface ODKPCharacterImportData {
  Active: number;
  Name: string;
  Rank?: string;
  Class: string;
  Level: number;
  Race: string;
  Gender: string;
}

export interface ODKPCharacterLinkData {
  ParentId: number;
  ChildId: number;
}

export interface LinkInfo {
  MemberName: string;
  MemberId: number;
  AccountId: number;
  AccountName: string;
}

export const odkpCharacterCache = new LRUCache<string, ODKPCharacterData>({
  ttl: 10 * MINUTES,
});

let accessTokens: IAccessTokenResult;

export const openDkpService = {
  authenticate: async () => {
    if (openDkpUsername && openDkpPassword && openDkpAuthClientId) {
      openDkpService
        .doUserPasswordAuth(
          openDkpUsername,
          openDkpPassword,
          openDkpAuthClientId
        )
        .then(async () => {
          console.log("Authenticated with OpenDKP");
          await openDkpService.getCharacters();
          await openDkpService.importData();
        })
        .catch((reason) => {
          console.log("Failed to authenticate with OpenDKP: " + reason);
        });
    }
  },
  doUserPasswordAuth: async (
    username: string,
    password: string,
    clientId: string
  ) => {
    const data = {
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
    };

    const config = {
      method: "post",
      url: "https://cognito-idp.us-east-2.amazonaws.com/",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      data: JSON.stringify(data),
    };
    try {
      const response = await axios(config);
      accessTokens = response.data?.AuthenticationResult;
      openDkpService.logIfVerbose(response);
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
    }
  },
  getCharacters: async (): Promise<ODKPCharacterData[]> => {
    const config = {
      method: "get",
      url: `https://api.opendkp.com/clients/${openDkpClientName}/characters?IncludeInactives=true`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
    };

    try {
      const cachedChars: ODKPCharacterData[] = [];
      for (const cacheChar of odkpCharacterCache.values()) {
        cachedChars.push(cacheChar);
      }
      if (cachedChars.length > 0) {
        return cachedChars;
      }
      const response = await axios(config);
      const characters = response.data as ODKPCharacterData[];
      characters.forEach((c) => {
        odkpCharacterCache.set(c.Name, c, { ttl: 3000000 });
      });
      console.log(`Cached ${characters.length} characters`);
      return characters;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  getItemId: async (itemName: string): Promise<ODKPItemResponse> => {
    const config = {
      method: "get",
      url: `https://api.opendkp.com/items/autocomplete?item=${itemName}`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
    };
    try {
      const response = await axios(config);
      return response.data[0] || undefined;
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  createRaidFromTicks: async (ticks: RaidTick[]) => {
    const characters = await openDkpService.getCharacters();
    const items = await Promise.all(
      ticks.flatMap((tick) =>
        tick.data.loot.map(async (item) => {
          const odkpItem = await openDkpService.getItemId(item.item);
          return {
            CharacterName: item.buyer,
            Dkp: item.price,
            ItemName: odkpItem.ItemName,
            GameItemId: odkpItem.GameItemId,
            ItemId: odkpItem.ItemID,
          } as ODKPRaidItem;
        })
      )
    );

    const odkpTicks = ticks.flatMap((tick) => {
      const cleanTickName = tick.name.replace(/^(✅|❕|❔)/, "").trim();

      const unregisteredCharacters = tick.data.attendees.filter((raider) => {
        return !characters.find((odkpChar) => odkpChar.Name === raider);
      });

      if (unregisteredCharacters.length > 0) {
        throw new Error(
          `Character(s) not found on OpenDKP: ${unregisteredCharacters.join(
            ", "
          )}`
        );
      }

      return {
        Characters: tick.data.attendees.map((char) => {
          return {
            Name: char,
          };
        }),
        Description: cleanTickName,
        Value: tick.data.value,
      } as ODKPRaidTick;
    });

    const name = odkpTicks
      .flatMap((tick) => {
        return tick.Description;
      })
      .join(", ");

    const raidData = {
      Attendance: 1,
      Items: items,
      Pool: {
        Description: "Scars of Velious",
        Name: "SoV",
        PoolId: 4,
      },
      Name: name,
      Ticks: odkpTicks,
      Timestamp: moment.utc(ticks[0].uploadDate).toISOString(),
    } as ODKPRaidData;

    await openDkpService.addRaid(raidData);
    await openDkpService.doTickAdjustments(ticks);
  },
  doTickAdjustments: async (ticks: RaidTick[]) => {
    for (const tick of ticks) {
      if (tick.data.adjustments) {
        for (const adj of tick.data.adjustments) {
          await openDkpService.addAdjustment({
            Character: { Name: adj.player },
            Description: tick.note,
            Name: adj.reason,
            Value: adj.value,
            Timestamp: moment.utc(ticks[0].uploadDate).toISOString(),
          });
        }
      }
    }
  },
  addItem: async (
    buyer: string,
    itemName: string,
    note: string,
    price: number
  ) => {
    await openDkpService.getCharacters();
    const character = odkpCharacterCache.get(buyer);
    if (!character) {
      console.log(`Failed to find character ${buyer}`);
      return;
    }
    const itemData = await openDkpService.getItemId(itemName);
    if (itemData && itemData.ItemID !== -1) {
      const item = {
        CharacterId: character.CharacterId,
        Dkp: price,
        Notes: note,
        ItemId: itemData.ItemID,
      };
      const config = {
        method: "put",
        url: `https://api.opendkp.com/clients/${openDkpClientName}/raids/${openDkpAuctionRaidId}/items`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(item),
      };
      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
        })
        .catch(function (error) {
          console.log(error);
        });
    }
  },
  addAdjustment: async (adjustment: ODKPAdjustment) => {
    try {
      console.log(`OpenDKP - adding adjustment: ${JSON.stringify(adjustment)}`);
      const addAdjustment = {
        method: "put",
        url: `https://api.opendkp.com/clients/${openDkpClientName}/adjustments`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
        },
        data: JSON.stringify(adjustment),
      };
      const resp = await axios(addAdjustment);
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`OpenDKP - added adjustment: ${JSON.stringify(resp.data)}`);
      openDkpService.logIfVerbose(resp);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to add adjustment: ${err})}`);
      console.log(err);
    }
  },
  delAdjustment: async (id: string) => {
    try {
      console.log(`OpenDKP - deleting adjustment: ${id}`);
      const delAdjustment = {
        method: "delete",
        url: `https://api.opendkp.com/clients/${openDkpClientName}/adjustments/${id}`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
        },
      };
      const resp = await axios(delAdjustment);
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`OpenDKP - deleted adjustment: ${JSON.stringify(resp.data)}`);
      openDkpService.logIfVerbose(resp);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to delete adjustment: ${err})}`);
      console.log(err);
    }
  },
  addPlayer: async (
    name: string,
    charClass?: string,
    race?: string,
    level?: number,
    gender?: string
  ): Promise<ODKPCharacterData> => {
    const odkpCharacter = {
      Active: 1,
      Name: name,
      Class: charClass,
      Level: level,
      Race: race,
      Gender: gender,
      Rank: "Member",
    } as ODKPCharacterImportData;
    const putCharacter = {
      method: "put",
      url: `https://api.opendkp.com/clients/${openDkpClientName}/characters`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(odkpCharacter),
    };
    console.log(odkpCharacter);

    try {
      const resp = await axios(putCharacter);
      console.log(JSON.stringify(resp.data));
      openDkpService.logIfVerbose(resp);
      return resp.data as ODKPCharacterData;
    } catch (err: unknown) {
      console.log(err);
      throw err;
    }
  },
  processLinkedCharacters: async (
    linkInfo: LinkInfo[],
    mainChar: ODKPCharacterData | undefined,
    odkpCharacterData: ODKPCharacterData[]
  ) => {
    if (!mainChar) {
      mainChar = odkpCharacterData.find(
        (c) => c.Name === linkInfo[0].MemberName
      );
    }
    // If still no mainChar, exit early
    if (!mainChar) {
      console.error("Could not find main character");
      return;
    }
    for (const link of linkInfo) {
      const character = odkpCharacterData.find(
        (c) => c.Name === link.MemberName
      );
      if (character && character.ParentId === 0 && character !== mainChar) {
        console.log(`Linking ${character.Name} to ${mainChar.Name}`);
        await openDkpService.linkCharacter({
          ChildId: character.CharacterId,
          ParentId: mainChar.CharacterId,
        });
      }
    }
  },
  linkCharacter: async (linkData: ODKPCharacterLinkData) => {
    const linkCharacter = {
      method: "put",
      url: `https://api.opendkp.com/clients/${openDkpClientName}/characters/links`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(linkData),
    };

    try {
      const resp = await axios(linkCharacter);
      console.log(JSON.stringify(resp.data));
      openDkpService.logIfVerbose(resp);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err: unknown) {
      console.log(err);
    }
  },
  updatePlayer: async (character: ODKPCharacterData) => {
    const updateCharacter = {
      method: "post",
      url: `https://api.opendkp.com/clients/${openDkpClientName}/characters/${character.CharacterId}`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(character),
    };

    try {
      const resp = await axios(updateCharacter);
      console.log(JSON.stringify(resp.data));
      openDkpService.logIfVerbose(resp);
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (err: unknown) {
      console.log(err);
    }
  },
  searchItem: async (itemName: string): Promise<ODKPItemResponse> => {
    const cleanItemName = decodeHtmlEntities(itemName);
    const getItem = {
      method: "get",
      url: "https://api.opendkp.com/items/autocomplete",
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      params: {
        item: cleanItemName,
        game: 0,
      },
    } as AxiosRequestConfig;

    try {
      const resp = await axios(getItem);
      const itemResp = resp.data as ODKPItemResponse[];
      if (itemResp.length > 0) {
        console.log(JSON.stringify(itemResp));
        return itemResp[0];
      } else {
        throw new Error("No item found");
      }
    } catch (err: unknown) {
      console.log(err);
      throw err;
    }
  },
  getRaid: async (raidId: number): Promise<ODKPRaidData> => {
    const getRaid = {
      method: "get",
      url: `https://api.opendkp.com/clients/${openDkpClientName}/raids/${raidId}`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
    } as AxiosRequestConfig;

    try {
      const resp = await axios(getRaid);
      const raidResp = resp.data as ODKPRaidData;
      console.log(JSON.stringify(raidResp));
      return raidResp;
    } catch (err: unknown) {
      console.log(err);
      throw err;
    }
  },
  addRaid: async (raid: ODKPRaidData) => {
    try {
      console.log(`OpenDKP - adding raid: ${JSON.stringify(raid)}`);

      const putRaid: AxiosRequestConfig = {
        method: "put",
        url: `https://api.opendkp.com/clients/${openDkpClientName}/raids`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(raid),
      };

      const resp = await axios(putRaid);
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(`OpenDKP - added raid: ${JSON.stringify(resp.data)}`);
      openDkpService.logIfVerbose(resp);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to add raid: ${err}`);
      console.log(err);
    }
  },
  updateRaid: async (raidId: string, payload: ODKPUpdateRaidData) => {
    try {
      console.log(`OpenDKP - updating raid: ${JSON.stringify(raidId)}`);

      const postRaid = {
        method: "post",
        url: `https://api.opendkp.com/clients/${openDkpClientName}/raids/${raidId}`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(payload),
      };

      const resp = await axios(postRaid);
      await new Promise((resolve) => setTimeout(resolve, 200));
      console.log(`OpenDKP - updated raid: ${JSON.stringify(resp.data)}`);
      openDkpService.logIfVerbose(resp);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to update raid: ${err}`);
      throw err;
    }
  },
  importData: async () => {
    if (fs.existsSync("./players.csv")) {
      try {
        await processTsvFileWithHeaders(
          "./players.csv",
          async (row: RowObject) => {
            if (
              !odkpCharacterCache.has(capitalize(row.member_name.split(" ")[0]))
            ) {
              await openDkpService.handleCharacterImportRow(row);
            }
          },
          ["profiledata"]
        );
      } catch (err: unknown) {
        console.log(err);
      }
    }
    // if (fs.existsSync("./characters.json")) {
    //   try {
    //     const characters = JSON.parse(
    //       fs.readFileSync("./characters.json", { encoding: "utf-8" })
    //     ) as ODKPCharacterData[];
    //     for (const character of characters) {
    //       // do updates here...
    //       await openDkpService.updatePlayer(character);
    //     }
    //   } catch (err: unknown) {
    //     console.log(err);
    //   }
    // }
    if (fs.existsSync("./characters.json") && fs.existsSync("./links.csv")) {
      try {
        // const odkpCharacters = JSON.parse(
        //   fs.readFileSync("./characters.json", { encoding: "utf-8" })
        // ) as ODKPCharacterData[];
        const odkpCharacters = await openDkpService.getCharacters();
        const eqdkpChars: LinkInfo[] = [];
        await processTsvFileWithHeaders(
          "./links.csv",
          async (row: RowObject) => {
            eqdkpChars.push({
              MemberName: row.member_name.split(" ")[0],
              MemberId: Number.parseInt(row.member_id),
              AccountId: Number.parseInt(row.user_id),
              AccountName: row.username,
            });
          }
        );

        const groups = eqdkpChars.reduce((acc, item) => {
          const key = item.AccountId;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(item);
          return acc;
        }, {} as Record<string, LinkInfo[]>);

        for (const [userid, characters] of Object.entries(groups)) {
          if (characters) {
            await openDkpService.processLinkedCharacters(
              characters,
              undefined,
              odkpCharacters
            );
          } else {
            throw new Error("Failed to find link");
          }
        }
      } catch (err: unknown) {
        console.log(err);
        throw err;
      }
    }

    if (fs.existsSync("./adjustments.csv")) {
      const adjustments: RowObject[] = [];
      await processTsvFileWithHeaders(
        "./adjustments.csv",
        async (row: RowObject) => {
          if (row.member_name) {
            adjustments.push(row);
          }
        }
      );

      for (const adjustment of adjustments) {
        const odkpAdjustmentPayload: ODKPAdjustment = {
          Character: { Name: adjustment.member_name.split(" ")[0] },
          Description: adjustment.adjustment_reason || "N/A",
          Name: adjustment.adjustment_reason || "N/A",
          Timestamp: new Date(
            Number.parseInt(adjustment.adjustment_date) * 1000
          ).toISOString(),
          Value: Number.parseFloat(adjustment.adjustment_value) || 0,
        };

        await openDkpService.addAdjustment(odkpAdjustmentPayload);
      }
    }
    if (fs.existsSync("./items.json") && fs.existsSync("./items.csv")) {
      // Can be used to output not-found items given the latest-items.json (https://cb-opendkp.s3.us-east-2.amazonaws.com/cache/latest-items.json)
      // and an eqdkp item export
      const items: RowObject[] = [];
      await processTsvFileWithHeaders("./items.csv", async (row: RowObject) => {
        items.push(row);
      });
      let itemCache: ODKPItemDbItem[];
      if (fs.existsSync("./items.json")) {
        itemCache = JSON.parse(
          fs.readFileSync("./items.json", { encoding: "utf-8" })
        );
        const ws = fs.createWriteStream("./missing-items.csv");
        ws.write(`Name\tValue\tItemId\tGameItemId\tMember\tRaidId\n`);
        for (const item of items) {
          const foundItems = itemCache.filter((i) => i.Name === item.item_name);
          if (foundItems.length === 0) {
            const row = `${item.item_name}\t${item.item_value}\t''\t''\t${item.member_name}\t${item.raid_id}\n`;
            ws.write(row);
          }
        }
        ws.close();
      }
    }
    if (
      fs.existsSync("./raids.csv") &&
      fs.existsSync("./items.csv") &&
      fs.existsSync("./attendees.csv")
    ) {
      const raids: Map<string, RowObject> = new Map();
      const items: RowObject[] = [];
      const attendees: RowObject[] = [];

      await processTsvFileWithHeaders("./raids.csv", async (row: RowObject) => {
        if (row.raid_id) {
          raids.set(row.raid_id, row);
        }
      });

      await processTsvFileWithHeaders("./items.csv", async (row: RowObject) => {
        items.push(row);
      });

      await processTsvFileWithHeaders(
        "./attendees.csv",
        async (row: RowObject) => {
          attendees.push(row);
        }
      );
      // Export from raids tab of opendkp
      const isUpdate = fs.existsSync("./raids.json");
      let jsonRaids;
      let raidObj;
      if (isUpdate) {
        jsonRaids = fs.readFileSync("./raids.json", {
          encoding: "utf-8",
        });

        // this is not perfect, if you have raids with the exact same name
        // you will not be able to update them cleanly. fix them in the source data first
        raidObj = Object.fromEntries(
          JSON.parse(jsonRaids).map((r: { RaidId: string; Name: string }) => [
            r.Name,
            r.RaidId,
          ])
        );
      }
      const missingItems: RowObject[] = [];
      await processTsvFileWithHeaders(
        "./missing-items.csv",
        async (row: RowObject) => {
          missingItems.push(row);
        }
      );

      let itemCache: ODKPItemDbItem[];
      if (fs.existsSync("./items.json")) {
        itemCache = JSON.parse(
          fs.readFileSync("./items.json", { encoding: "utf-8" })
        );
      }
      for (const raid of raids.values()) {
        const raidValue = Number.parseFloat(raid.raid_value);
        const raidItems: ODKPRaidItem[] = await Promise.all(
          items
            .filter((i) => i.raid_id === raid.raid_id)
            .map(async (i) => {
              let item: ODKPItemDbItem | undefined;
              try {
                item = itemCache.filter(
                  (item) => capitalize(i.item_name) === item.Name
                )[0];
                // Can search for items but a local db is faster
                // if (!item) {
                //   item = await openDkpService.searchItem(i.item_name);
                //   itemCache[item.ItemName] = item;
                // }
              } catch (err: unknown) {
                throw new Error("Item not found");
              }

              return {
                CharacterName: i.member_name.split(" ")[0],
                Dkp: Number.parseFloat(i.item_value),
                GameItemId: item.GameItemId,
                ItemId: item.ItemId,
                ItemName: item.Name,
                Notes: raid.raid_note,
              } as ODKPRaidItem;
            })
        );
        const raidCharacters = attendees
          .filter((a) => a.raid_id === raid.raid_id)
          .map((a) => {
            return {
              Name: a.member_name.split(" ")[0],
            };
          }) as ODKPRaidTickCharacter[];
        const raidTicks: ODKPRaidTick[] = [];
        if (
          raidCharacters.length > 0 &&
          raidCharacters[0].Name !== "Clockwork Steward"
        ) {
          raidTicks.push({
            Description: raid.raid_note,
            Value: raidValue,
            Characters: raidCharacters,
          });
        }
        const isUpdate = fs.existsSync("./raids.json");
        const raidName = raid.raid_note;
        if (isUpdate) {
          if (raidObj && !raidObj[raidName]) {
            throw new Error("Raid doesn't exist in export");
          }
          const odkpRaid = await openDkpService.getRaid(raidObj?.[raidName]);
          if (!odkpRaid.Version || !odkpRaid.RaidId) {
            throw new Error(
              `Version not found, can't update - ${raidObj?.RaidId}`
            );
          } else {
            const raidUpdatePayload: ODKPUpdateRaidData = {
              Attendance: raidCharacters.length > 0 ? 1 : 0,
              ClientId: env.openDkpSiteClientId || "",
              RaidId: odkpRaid.RaidId.toString(),
              Items: raidItems,
              Name: raidName,
              Pool: {
                Description: "Scars of Velious",
                Name: "SoV",
                PoolId: 4,
              },
              Ticks: raidTicks,
              Timestamp: odkpRaid.Timestamp,
              Version: odkpRaid.Version,
            };

            await openDkpService.updateRaid(
              raidUpdatePayload.RaidId,
              raidUpdatePayload
            );
          }
        } else {
          const raidPayload: ODKPRaidData = {
            Attendance: raidCharacters.length > 0 ? 1 : 0,
            Items: raidItems,
            Name: raid.raid_note,
            Pool: {
              Description: "Scars of Velious",
              Name: "SoV",
              PoolId: 4,
            },
            Ticks: raidTicks,
            Timestamp: new Date(
              Number.parseInt(raid.raid_date) * 1000
            ).toISOString(),
          };

          await openDkpService.addRaid(raidPayload);
        }
      }
    }
  },

  handleCharacterImportRow: async (row: RowObject) => {
    if (isNaN(Number.parseInt(row.member_id)) || !row.profiledata) return;
    try {
      console.log(row.member_name);
      console.log(row.profiledata);
      const profiledata = row.profiledata as unknown as {
        race: string;
        class: string;
        guild: string;
        gender: string;
        level: string;
      };
      await openDkpService.addPlayer(
        row["member_name"].split(" ")[0],
        convertClass(profiledata.class),
        convertRace(profiledata.race),
        Number.parseInt(profiledata.level) || 1,
        toSentenceCase(profiledata.gender) || "Unknown"
      );
    } catch (error: unknown) {
      console.log(error);
    }
  },
  logIfVerbose(log: unknown) {
    if (env.openDkpVerboseLogging === "1") {
      console.log(log);
    }
  },
};
