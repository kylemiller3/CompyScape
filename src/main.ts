import * as discord from 'discord.js';

import { EventEmitter, } from 'events';
import {
    fromEvent, Observable, Subject, merge,
} from 'rxjs';
import {
    filter, tap,
} from 'rxjs/operators';
import auth from './auth.json';
import { Command, } from './commands/command';
import { Utils, } from './utils';
import adminSetChannel from './commands/adminSetChannel';
import eventsAdd from './commands/eventsAdd';
import eventsDelete from './commands/eventsDelete';
import eventsEdit from './commands/eventsEdit';
import eventsEndEvent from './commands/eventsEndEvent';
import eventsForceSignup from './commands/eventsForceSignup';
import eventsForceUnsignup from './commands/eventsForceUnsignup';
import eventsUpdateScore from './commands/eventsUpdateScore';
import eventsListActive from './commands/eventsListActive';
import eventsListAll from './commands/eventsListAll';
import eventsListParticipants from './commands/eventsListParticipants';
import eventsAmISignedUp from './commands/eventsAmISignedUp';
import eventsSignup from './commands/eventsSignup';
import eventsUnsignup from './commands/eventsUnsignup';
import usersStats from './commands/usersStats';
import help from './commands/help';

/**
 * Global discord client
 * @category Global
 */
const gClient: discord.Client = new discord.Client();

/**
 * Helper function to determine if a user has access to the command
 * @param guild the Guild to use
 * @param author the Author to check
 * @returns true if the Author has admin access to the bot
 * @category Helper
 */
// eslint-disable-next-line import/prefer-default-export
export const isAdmin = (
    guild: discord.Guild,
    author: discord.User,
): boolean => {
    const guildMember: discord.GuildMember = guild.members.get(
        author.id
    );
    if (guildMember === undefined) {
        Utils.logger.warn(
            `${author.username} was not found in ${guild.name}'s member list. Returning false.`
        );
    }
    return guildMember.permissions.has(
        discord.Permissions.FLAGS.ADMINISTRATOR
    ) || guildMember.roles.some(
        (role: discord.Role):
        boolean => role.name.toLowerCase() === 'osrs event manager'
    );
};


/**
 * Observable of all Discord message events
 * @category Observable
 */
const messageReceived$: Observable<discord.Message> = fromEvent(
    gClient as unknown as EventEmitter,
    'message'
);

/**
 * Subject of injected Discord message events
 * @category Observable
 */
const messageInjector$: Subject<discord.Message> = new Subject();

const mergedMessage$: Observable<discord.Message> = merge(
    messageReceived$,
    messageInjector$,
);

/**
 * Function that filters all Discord commands messages
 * @category Observable
 */
const commandReceived$ = (
    command: Command.ALL
): Observable<discord.Message> => mergedMessage$
    .pipe(
        filter(
            (msg: discord.Message):
            boolean => msg.guild
                && msg.guild.available
                && Command.isValid(
                    command,
                    msg.content
                )
        ),
        tap(
            (msg: discord.Message):
            void => {
                Utils.logger.debug(`message: ${msg.content}`);
                Utils.logger.debug(`author: ${msg.author.username}`);
                Utils.logger.debug(`guild: ${msg.guild.name}`);
            }
        ),
        filter(
            (msg: discord.Message):
            boolean => Command.hasAccess(
                command,
                isAdmin(
                    msg.guild,
                    msg.author,
                )
            )
        ),
        tap(
            ():
            void => Utils.logger.debug('access: true')
        ),
    );

//--------------
// Global script
//
//--------------

gClient.login(auth.token);


commandReceived$(Command.ALL.ADMIN_SET_CHANNEL).subscribe(adminSetChannel);
commandReceived$(Command.ALL.EVENTS_ADD).subscribe(eventsAdd);
commandReceived$(Command.ALL.EVENTS_DELETE).subscribe(eventsDelete);
commandReceived$(Command.ALL.EVENTS_EDIT).subscribe(eventsEdit);
commandReceived$(Command.ALL.EVENTS_END_EVENT).subscribe(eventsEndEvent);
commandReceived$(Command.ALL.EVENTS_FORCE_SIGNUP).subscribe(eventsForceSignup);
commandReceived$(Command.ALL.EVENTS_FORCE_UNSIGNUP).subscribe(eventsForceUnsignup);
commandReceived$(Command.ALL.EVENTS_UPDATE_SCORE).subscribe(eventsUpdateScore);
commandReceived$(Command.ALL.EVENTS_LIST_ACTIVE).subscribe(eventsListActive);
commandReceived$(Command.ALL.EVENTS_LIST_ALL).subscribe(eventsListAll);
commandReceived$(Command.ALL.EVENTS_LIST_PARTICIPANTS).subscribe(eventsListParticipants);
commandReceived$(Command.ALL.EVENTS_AMISIGNEDUP).subscribe(eventsAmISignedUp);
commandReceived$(Command.ALL.EVENTS_SIGNUP).subscribe(eventsSignup);
commandReceived$(Command.ALL.EVENTS_UNSIGNUP).subscribe(eventsUnsignup);
commandReceived$(Command.ALL.USERS_STATS).subscribe(usersStats);
commandReceived$(Command.ALL.HELP).subscribe(help);
