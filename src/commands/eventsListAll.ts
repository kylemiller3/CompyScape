import * as discord from 'discord.js';
import { Event, } from '../event';
import { MessageWrapper, } from '../messageWrapper';
import { Db, } from '../database';
import { gClient, getDiscordGuildName, } from '../main';

const eventsListAll = async (
    msg: discord.Message
): Promise<void> => {
    // const now: Date = new Date();
    const localEvents: Event.Obj[] | null = await Db.fetchAllGuildEvents(
        msg.guild.id,
        Db.mainDb
    );
    const globalEvents: Event.Obj[] | null = await Db.fetchAllInvitedEvents(
        msg.guild.id,
    );
    if (localEvents === null
        && globalEvents === null) {
        MessageWrapper.sendMessage({
            message: msg,
            content: 'No events.',
        });
    } else {
        const localContent: string = localEvents !== null
            ? localEvents.map(
                (event: Event.Obj):
                string => {
                    const status: string = Event.getStatusStr(event);
                    const b = event.global;
                    return `#${event.id} ${event.name} (${event.tracking.category})\n\t\tstatus: ${status}\n\t\tstarts: ${event.when.start.toUTCString()}\n\t\tends: ${event.when.end.toUTCString()}`;
                }
            ).join('\n\t')
            : '';
        const globalContent: string = globalEvents !== null
            ? globalEvents.map(
                (event: Event.Obj):
                string => {
                    const status: string = Event.getStatusStr(event);
                    let guildName: string | null = getDiscordGuildName(
                        gClient,
                        event.guilds.creator.discordId,
                    );
                    guildName = guildName !== null
                        ? ` ${guildName}`
                        : '';
                    return `#${event.id} ${event.name} (${event.tracking.category})\n\t\towner:${guildName} (${event.guilds.creator.discordId})\n\t\tstatus: ${status}\n\t\tstarts: ${event.when.start.toUTCString()}\n\t\tends: ${event.when.end.toUTCString()}`;
                }
            ).join('\n\t')
            : '';
        const content = `Your guild events:\n\t${localContent}\n\nGlobal events:\n\t${globalContent}`;
        MessageWrapper.sendMessage({
            message: msg,
            content,
            options: {
                reply: msg,
                code: true,
            },
        });
    }
};

export default eventsListAll;
