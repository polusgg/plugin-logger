export type Event<Detail = any> = {
  type: "lobbyCreated";
  creatorUuid: string;
  lobbyUuid: string;
  code: string;
} | {
  type: "lobbyJoined";
  lobbyUuid: string;
  connectionUuid: string;
  connectionId: number;
} | {
  type: "lobbyLeft";
  connectionUuid: string;
} | {
  type: "hostReassigned";
  fromUuid: string;
  toUuid: string;
} | {
  type: "gameSettings";
  gameUuid: string;
  settings: {
    [key: string]: number | string | boolean;
  };
} | {
  type: "gamePlayerSpawned";
  gameUuid: string;
  player: {
    uuid: string;
    id: number;
    ownerUuid: string;
    cosmetics: {
      [type: string]: number;
    };
  };
  detail: Detail;
  tasks: number[];
} | {
  type: "gameCreated";
  lobbyUuid: string;
  gameUuid: string;
} | {
  type: "gameEvent";
  gameUuid: string;
  eventUuid: string;
  position: [number, number];
  starterUuid: string;
  detail: Detail;
} | {
  type: "gameEventEnded";
  eventUuid: string;
  detail: Detail;
} | {
  type: "playerMove";
  playerUuid: string;
  position: [number, number];
} | {
  type: "playerTaskCompleted";
  playerUuid: string;
  task: number;
} | {
  type: "playerDiedEvent";
  playerUuid: string;
  detail: Detail;
} | {
  type: "gameEnded";
  reason: Detail;
  winnerUuids: string[];
  gameUuid: string;
} | {
  type: "lobbyDestroyed";
  lobbyUuid: string;
} | {
  type: "lfgFired";
  lobbyUuid: string;
  discordChannelId: number;
} | {
  type: "meetingCreated";
  gameUuid: string;
  meetingUuid: string;
  callerUuid: string;
} | {
  type: "meetingVote";
  meetingUuid: string;
  accuserUuid: string;
  accusedUuid: string | undefined;
} | {
  type: "meetingEnded";
  meetingUuid: string;
  exiledUuid: string | undefined;
} | {
  type: "sabotageStarted";
  sabotageUuid: string;
  sabotageType: string;
  callerUuid: string | undefined;
  detail: Detail;
} | {
  type: "sabotageEnded";
  sabotageUuid: string;
  detail: Detail;
} | {
  type: "doorClosed";
  gameUuid: string;
  closerUuid: string | undefined;
  detail: Detail;
  doorIds: number[];
} | {
  type: "doorOpened";
  gameUuid: string;
  openerUuid: string | undefined;
  detail: Detail;
  doorIds: number[];
} | {
  type: "ventEntered";
  playerUuid: string;
  ventId: number;
} | {
  type: "ventExited";
  playerUuid: string;
  ventId: number;
} | {
  type: "playerChat";
  connectionUuid: string;
  lobbyUuid: string;
  gameUuid?: string;
  message: string;
};

export type SpecificEvent<T extends Event["type"], D = any> = Extract<Event<D>, { type: T }>;
