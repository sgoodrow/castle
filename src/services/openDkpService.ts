import axios from "axios";
import { AdjustmentData, RaidTick } from "../features/dkp-records/raid-tick";
import moment from "moment";
import LRUCache from "lru-cache";
import { MINUTES } from "../shared/time";
import {
  convertClass,
  convertRace,
  processTsvFileWithHeaders,
  RowObject,
  toSentenceCase,
} from "../shared/util";

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

export const openDkpService = {
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
      openDkpService.loadCharacters();
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

    const config = {
      method: "put",
      url: "https://api.opendkp.com/clients/castle/raids",
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(raidTick),
    };

    axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
        openDkpService.doTickAdjustments(ticks);
      })
      .catch(function (error) {
        console.log(error);
      });
  },
  doTickAdjustments: async (ticks: RaidTick[]) => {
    ticks.forEach((tick) => {
      tick.data.adjustments?.forEach(async (adj) => {
        // const adjustment: ODKPAdjustment = {
        //   Character: { Name: adj.player },
        //   Name: adj.reason,
        //   Description: tick.name,
        //   Value: adj.value,
        //   Timestamp: moment.utc(ticks[0].uploadDate).toISOString(),
        // };
        await openDkpService.addAdjustment({
          player: adj.player,
          reason: adj.reason,
          value: adj.value,
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
        url: `https://api.opendkp.com/clients/castle/raids/70551/items`,
        headers: {
          Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
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
  addAdjustment: async (adjustment: {
    player: string;
    value: number;
    reason: string;
  }) => {
    const odkpAdjustment = {
      Character: {
        Name: adjustment.player,
      },
      Description: adjustment.reason,
      Name: adjustment.reason,
      Value: adjustment.value,
      Timestamp: moment.utc().toISOString(),
    };
    const config = {
      method: "put",
      url: "https://api.opendkp.com/clients/castle/adjustments",
      headers: {
        Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
      },
      data: JSON.stringify(odkpAdjustment),
    };

    axios(config)
      .then(function (response) {
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error);
      });
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
    // const config = {
    //   method: "put",
    //   url: "https://api.opendkp.com/clients/castle/characters",
    //   headers: {
    //     Authorization: `${accessTokens.TokenType} ${accessTokens.IdToken}`,
    //   },
    //   data: JSON.stringify(odkpCharacter),
    // };
    console.log(odkpCharacter);

    // axios(config)
    //   .then(function (response) {
    //     console.log(JSON.stringify(response.data));
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //   });
  },
  importData: async (file: string) => {
    await processTsvFileWithHeaders(file, async (row: RowObject) => {
      if (file.includes("players.csv")) {
        await openDkpService.handleCharacterImportRow(row);
      }
    });
  },
  handleCharacterImportRow: async (row: RowObject) => {
    if (isNaN(Number.parseInt(row["member_id"]))) return;
    const unescaped = row["profiledata"]
      .replace(/""/g, '"')
      .replace(/^"|"$/g, "");
    const characterDetails: {
      race: string;
      class: string;
      guild: string;
      gender: string;
      level: string;
    } = JSON.parse(unescaped);
    //const status = row["member_status"] === "FALSE" ? 0 : 1;
    // everyone is active for now? eqdkp data seems wrong
    await openDkpService.addPlayer(
      row["member_name"],
      convertClass(characterDetails.class),
      convertRace(characterDetails.race),
      Number.parseInt(characterDetails.level),
      toSentenceCase(characterDetails.gender),
      1
    );
  },
};
