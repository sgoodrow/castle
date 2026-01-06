import axios, { AxiosRequestConfig } from "axios";
import { RaidTick } from "../features/dkp-records/raid-tick";
import moment from "moment";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import {
  convertClass,
  convertRace,
  decodeHtmlEntities,
  processTsvFileWithHeaders,
  RowObject,
  toSentenceCase,
} from "../shared/util";
import fs from "fs";
import { env } from "process";
import { openDkpUsername, openDkpPassword, openDkpAuthClientId } from "../config";

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

const characterCache = new LRUCache<string, ODKPCharacterData>({
  ttl: 60 * MINUTES,
});

let accessTokens: IAccessTokenResult;

//const itemCache: Map<string, ODKPItemResponse> = new Map();

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
      await openDkpService.loadCharacters();
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
    }
  },
  loadCharacters: async (): Promise<void> => {
    const config = {
      method: "get",
      url: `https://api.opendkp.com/clients/castle/characters?IncludeInactives=true`,
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
    };

    try {
      const response = await axios(config);
      if (response.status === 200) {
        (response.data as ODKPCharacterData[]).forEach((char) => {
          characterCache.set(char.Name, char);
        });
        console.log(`Loaded ${characterCache.size} characters`);
      }
    } catch (error) {
      console.log(error);
    }
    return;
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
    }
    return { GameItemId: -1, ItemID: -1, ItemName: "" };
  },

  createRaid: async (ticks: RaidTick[]) => {
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
    const name = ticks
      .flatMap((tick) => {
        return tick.name;
      })
      .join(", ");
    const odkpTicks = ticks.flatMap((tick) => {
      return {
        Characters: tick.data.attendees.map((char) => {
          return {
            Name: char,
          };
        }),
        Description: tick.data.event?.name,
        Value: tick.data.value,
      } as ODKPRaidTick;
    });

    const raidTick = {
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

    await openDkpService.addRaid(raidTick);
  },
  doTickAdjustments: async (ticks: RaidTick[]) => {
    ticks.forEach((tick) => {
      tick.data.adjustments?.forEach(async (adj) => {
        await openDkpService.addAdjustment({
          Character: { Name: adj.player },
          Description: adj.reason,
          Name: adj.reason,
          Value: adj.value,
          Timestamp: moment.utc(ticks[0].uploadDate).toISOString(),
        });
      });
    });
  },
  addItem: async (
    buyer: string,
    itemName: string,
    note: string,
    price: number
  ) => {
    const character = characterCache.get(buyer);
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
        url: `https://api.opendkp.com/clients/castle/raids/89646/items`,
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
        url: "https://api.opendkp.com/clients/castle/adjustments",
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
        },
        data: JSON.stringify(adjustment),
      };
      const resp = await axios(addAdjustment);
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`OpenDKP - added adjustment: ${JSON.stringify(resp.data)}`);
      console.log(resp);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to add adjustment: ${err})}`);
      console.log(err);
    }
  },
  addPlayer: async (
    name: string,
    charClass: string,
    race: string,
    level: number,
    gender: string,
    active: number
  ) => {
    const odkpCharacter = {
      Active: active,
      Name: name,
      Class: charClass,
      Level: level,
      Race: race,
      Gender: gender,
    } as ODKPCharacterImportData;
    const putCharacter = {
      method: "put",
      url: "https://api.opendkp.com/clients/castle/characters",
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(odkpCharacter),
    };
    console.log(odkpCharacter);

    try {
      const resp = await axios(putCharacter);
      console.log(JSON.stringify(resp.data));
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
      // if (itemCache.has(cleanItemName)) {
      //   return itemCache.get(cleanItemName) as ODKPItemResponse;
      // }
      const resp = await axios(getItem);
      const itemResp = resp.data as ODKPItemResponse[];
      if (itemResp.length > 0) {
        //itemCache.set(itemResp[0].ItemName, itemResp[0]);
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
  addRaid: async (raid: ODKPRaidData) => {
    try {
      console.log(`OpenDKP - adding raid: ${JSON.stringify(raid)}`);

      const putRaid: AxiosRequestConfig = {
        method: "put",
        url: "https://api.opendkp.com/clients/castle/raids",
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(raid),
      };

      const resp = await axios(putRaid);
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(`OpenDKP - added raid: ${JSON.stringify(resp.data)}`);
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
        url: `https://api.opendkp.com/clients/castle/raids/${raidId}`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
          "Content-Type": "application/json",
        },
        data: JSON.stringify(payload),
      };

      const resp = await axios(postRaid);
      await new Promise((resolve) => setTimeout(resolve, 250));
      console.log(`OpenDKP - updated raid: ${JSON.stringify(resp.data)}`);
    } catch (err: unknown) {
      console.log(`OpenDKP - failed to update raid: ${err}`);
      throw err;
    }
  },
  importData: async () => {
    if (fs.existsSync("./players.csv")) {
      const charMap: Map<string, ODKPCharacterData> = new Map();
      const getCharacters = {
        method: "get",
        url: "https://api.opendkp.com/clients/castle/characters",
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
        },
        params: {
          IncludeInactives: true,
        },
      } as AxiosRequestConfig;
      try {
        const resp = await axios(getCharacters);
        console.log(resp.data);
        (resp.data as ODKPCharacterData[]).forEach((char) =>
          charMap.set(char.Name, char)
        );
        await processTsvFileWithHeaders(
          "./players.csv",
          async (row: RowObject) => {
            if (fs.existsSync("./players.csv")) {
              if (!charMap.has(row.member_name)) {
                await openDkpService.handleCharacterImportRow(row);
              }
            }
          },
          ["profiledata"]
        );
      } catch (err: unknown) {
        console.log(err);
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

      for (const raid of raids.values()) {
        const raidValue = Number.parseFloat(raid.raid_value);
        const raidItems: ODKPRaidItem[] = await Promise.all(
          items
            .filter((i) => i.raid_id === raid.raid_id)
            .map(async (i) => {
              let item: ODKPItemResponse | undefined;
              try {
                item = await openDkpService.searchItem(i.item_name);
              } catch (err: unknown) {
                item = { ItemName: i.item_name, GameItemId: -1, ItemID: -1 };
              }

              return {
                CharacterName: i.member_name.split(" ")[0],
                Dkp: Number.parseFloat(i.item_value),
                GameItemId: item.GameItemId,
                ItemId: item.ItemID,
                ItemName: item.ItemName,
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
        if (isUpdate) {
          const jsonRaids = fs.readFileSync("./raids.json", {
            encoding: "utf-8",
          });

          const raidObj = Object.fromEntries(
            JSON.parse(jsonRaids).map((r: { RaidId: string; Name: string }) => [
              r.Name,
              r,
            ])
          );
          if (!raidObj[raid.raid_note]) {
            throw new Error("Raid doesn't exist in export");
          }
          const raidUpdatePayload: ODKPUpdateRaidData = {
            Attendance: raidCharacters.length > 0 ? 1 : 0,
            ClientId: env.openDkpSiteClientId || "",
            RaidId: raidObj[raid.raid_note]?.RaidId || "0",
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
            Version: Number.parseInt(raid.version),
          };

          await openDkpService.updateRaid(
            raidUpdatePayload.RaidId,
            raidUpdatePayload
          );
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
        row["member_name"],
        convertClass(profiledata.class),
        convertRace(profiledata.race),
        Number.parseInt(profiledata.level) || 1,
        toSentenceCase(profiledata.gender) || "Unknown",
        1
      );
    } catch (error: unknown) {
      console.log(error);
    }
  },
};
