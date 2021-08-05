import { BasePlugin, PluginMetadata } from "@nodepolus/framework/src/api/plugin";
import { MongoClient } from "mongodb";
import { Events } from "./events";
import { v4 as uuidv4 } from "uuid";
import { DeathReason, SystemType } from "@nodepolus/framework/src/types/enums";

const pluginMetadata: PluginMetadata = {
  name: "Polus.gg Logger",
  version: [1, 0, 0],
  authors: [
    {
      name: "Polus.gg",
      email: "contact@polus.gg",
      website: "https://polus.gg",
    },
  ],
  description: "NodePolus plugin for logging",
  website: "https://polus.gg",
};

export default class extends BasePlugin {
  constructor() {
    super(pluginMetadata);

    if (process.env.MONGO_URL === undefined) {
      throw new Error("No mongo url set. expected env var MONGO_URL");
    }

    console.log(process.env.MONGO_URL);

    const client = new MongoClient(process.env.MONGO_URL, {
      tls: true,
      tlsCAFile: "../plugin-logger/ca-certificate.crt",
    });

    client.connect().then(_ => {
      Events.collection = client.db("polusgg-events").collection("events");

      this.logger.info("Event collection loaded");
    }).catch(console.log);

    this.server.on("server.lobby.created", evt => {
      const lobbyUuid = uuidv4();

      evt.getLobby().setMeta("pgg.log.uuid", uuidv4());

      Events.fire({
        type: "lobbyCreated",
        code: evt.getLobby().getCode(),
        creatorUuid: evt.getConnection().getMeta<string>("pgg.log.uuid"),
        lobbyUuid: lobbyUuid,
      });
    });

    this.server.on("server.lobby.join", evt => {
      if (evt.getLobby() !== undefined) {
        Events.fire({
          type: "lobbyJoined",
          connectionId: evt.getConnection().getId(),
          connectionUuid: evt.getConnection().getMeta<string>("pgg.log.uuid"),
          lobbyUuid: evt.getLobby()!.getMeta<string>("pgg.log.uuid"),
        });
      }
    });

    this.server.on("player.left", evt => {
      Events.fire({
        type: "lobbyLeft",
        connectionUuid: evt.getPlayer().getSafeConnection().getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("lobby.host.migrated", evt => {
      Events.fire({
        type: "hostReassigned",
        fromUuid: evt.getOldHost().getMeta<string>("pgg.log.uuid"),
        toUuid: evt.getNewHost().getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("game.started", evt => {
      evt.getGame().setMeta("pgg.log.uuid", uuidv4());

      evt.getGame().getLobby().getPlayers()
        .forEach(player => {
          player.setMeta("pgg.log.uuid", uuidv4());
        });

      setTimeout(() => {
        evt.getGame().getLobby().getPlayers()
          .forEach(player => {
            Events.fire({
              type: "gamePlayerSpawned",
              detail: player.getMeta<Record<string, unknown> | undefined>("pgg.log.detail") ?? {},
              gameUuid: evt.getGame().getMeta<string>("pgg.log.uuid"),
              player: {
                cosmetics: {
                  hat: player.getHat(),
                  pet: player.getPet(),
                  skin: player.getSkin(),
                  color: player.getColor(),
                },
                id: player.getId(),
                ownerUuid: player.getSafeConnection().getMeta<string>("pgg.log.uuid"),
                uuid: player.getMeta<string>("pgg.log.uuid"),
              },
              tasks: player.getTasks().map(t => t[0].id),
            });

            player.deleteMeta("pgg.log.detail");
          });

        Events.fire({
          type: "gameCreated",
          gameUuid: evt.getGame().getMeta<string>("pgg.log.uuid"),
          lobbyUuid: evt.getGame().getLobby().getMeta<string>("pgg.log.uuid"),
        });
      }, 100);
    });

    this.server.on("player.position.updated", event => {
      if (event.getPlayer().getMeta<string | undefined>("pgg.log.uuid") === undefined) {
        return;
      }

      Events.fire({
        type: "playerMove",
        playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
        position: [event.getNewPosition().getX(), event.getNewPosition().getY()],
      });
    });

    this.server.on("player.task.completed", event => {
      Events.fire({
        type: "playerTaskCompleted",
        playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
        task: event.getTask().id,
      });
    });

    this.server.on("player.died", event => {
      if (event.getReason() === DeathReason.Unknown) {
        setTimeout(() => {
          Events.fire({
            type: "playerDiedEvent",
            playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
            detail: event.getPlayer().getMeta<Record<string, unknown> | undefined>("pgg.log.deathDetail") ?? {},
          });
        }, 100);
      } else if (event.getReason() !== DeathReason.Murder) {
        Events.fire({
          type: "playerDiedEvent",
          playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
          detail: {
            reason: DeathReason[event.getReason()],
          },
        });
      }
    });

    this.server.on("player.murdered", event => {
      Events.fire({
        type: "playerDiedEvent",
        playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
        detail: {
          reason: DeathReason[DeathReason.Murder],
          murdererUuid: event.getKiller().getMeta<string>("pgg.log.uuid"),
        },
      });
    });

    this.server.on("server.lobby.destroyed", event => {
      Events.fire({
        type: "lobbyDestroyed",
        lobbyUuid: event.getLobby().getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("meeting.started", event => {
      event.getMeetingHud().getMeetingHud().setMeta("pgg.log.uuid", uuidv4());

      Events.fire({
        type: "meetingCreated",
        callerUuid: event.getCaller().getMeta<string>("pgg.log.uuid"),
        gameUuid: event.getGame().getMeta<string>("pgg.log.uuid"),
        meetingUuid: event.getMeetingHud().getMeetingHud().getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("meeting.vote.added", event => {
      const uuid = event.getGame().getLobby().getMeetingHud()!.getMeetingHud().getMeta<string>("pgg.log.uuid");

      Events.fire({
        type: "meetingVote",
        meetingUuid: uuid,
        accusedUuid: event.getSuspect()?.getMeta<string>("pgg.log.uuid"),
        accuserUuid: event.getVoter().getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("meeting.concluded", event => {
      const uuid = event.getGame().getLobby().getMeetingHud()!.getMeetingHud().getMeta<string>("pgg.log.uuid");

      Events.fire({
        type: "meetingEnded",
        meetingUuid: uuid,
        exiledUuid: event.getExiledPlayer()?.getMeta<string>("pgg.log.uuid"),
      });
    });

    this.server.on("room.sabotaged", event => {
      const sabotageUuid = uuidv4();

      event.getGame().setMeta("pgg.log.sabotage.uuid", sabotageUuid);

      Events.fire({
        type: "sabotageStarted",
        callerUuid: event.getPlayer()?.getMeta<string>("pgg.log.uuid"),
        sabotageUuid,
        detail: event.getGame().getMeta("pgg.log.sabotage.detail") ?? {},
        sabotageType: SystemType[event.getSystem().getType()],
      });

      event.getGame().deleteMeta("pgg.log.sabotage.detail");
    });

    this.server.on("room.repaired", event => {
      Events.fire({
        type: "sabotageEnded",
        sabotageUuid: event.getGame().getMeta("pgg.log.sabotage.uuid"),
        detail: event.getGame().getMeta("pgg.log.sabotage.detail") ?? {},
      });

      event.getGame().deleteMeta("pgg.log.sabotage.detail");
    });

    this.server.on("room.doors.opened", event => {
      Events.fire({
        type: "doorOpened",
        openerUuid: event.getPlayer()?.getMeta<string>("pgg.log.uuid"),
        detail: event.getGame().getMeta("pgg.log.door.detail") ?? {},
        gameUuid: event.getGame().getMeta<string>("pgg.log.uuid"),
        doorIds: event.getDoors(),
      });

      event.getGame().deleteMeta("pgg.log.door.detail");
    });

    this.server.on("room.doors.closed", event => {
      Events.fire({
        type: "doorClosed",
        closerUuid: event.getPlayer()?.getMeta<string>("pgg.log.uuid"),
        detail: event.getGame().getMeta("pgg.log.door.detail") ?? {},
        gameUuid: event.getGame().getMeta<string>("pgg.log.uuid"),
        doorIds: event.getDoors(),
      });

      event.getGame().deleteMeta("pgg.log.door.detail");
    });

    this.server.on("game.vent.entered", event => {
      Events.fire({
        type: "ventEntered",
        playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
        ventId: event.getVent().getId(),
      });
    });

    this.server.on("game.vent.exited", event => {
      Events.fire({
        type: "ventExited",
        playerUuid: event.getPlayer().getMeta<string>("pgg.log.uuid"),
        ventId: event.getVent().getId(),
      });
    });

    this.server.on("player.chat.message", event => {
      Events.fire({
        type: "playerChat",
        connectionUuid: event.getPlayer().getSafeConnection().getMeta<string>("pgg.log.uuid"),
        message: event.getMessage().toString(),
      });
    });
  }
}
