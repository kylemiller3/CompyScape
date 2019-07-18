// ------------------------------//
// OSRS discord bot by n0trout   //
// See LICENSE                   //
// ------------------------------//

import * as discord from 'discord.js'
import * as winston from 'winston'
import * as jsonfile from 'jsonfile'
import {
    fromEvent, from, Observable, of, forkJoin
} from 'rxjs'
import {
    FromEventTarget
} from 'rxjs/internal/observable/fromEvent'
import {
    publishReplay, refCount, take, skip, filter, switchMap, catchError, tap, map
} from 'rxjs/operators'
import {
    hiscores
} from 'osrs-json-api'
import auth from './auth.json'

// pull this out later
const stableSort = (array: unknown[], cmpFunc: Function): unknown[] => {
    const arrayWrapper = array.map((element, idx): Record<string, unknown> => ({
        element,
        idx
    }))

    // sort the wrappers, breaking sorting ties by using their elements orig index position
    arrayWrapper.sort((
        wrapperA: Record<string, unknown>,
        wrapperB: Record<string, unknown>
    ): number => {
        const cmpDiff = cmpFunc(wrapperA.element, wrapperB.element)
        return cmpDiff === 0
            ? (wrapperA.idx as number) - (wrapperB.idx as number)
            : cmpDiff
    })

    // unwrap and return the elements
    return arrayWrapper.map((wrapper: Record<string, unknown>): unknown => wrapper.element)
}

// osrs constants
const OSRS_SKILLS = {
    ATT: 'attack',
    STR: 'strength',
    DEF: 'defense',
    RANG: 'ranged',
    PRAY: 'prayer',
    MAG: 'magic',
    RC: 'runecrafting',
    CON: 'construction',
    HP: 'hitpoints',
    AGI: 'agility',
    HERB: 'herblore',
    THV: 'thieving',
    CRFT: 'crafting',
    FLE: 'fletching',
    SLAY: 'slayer',
    HNT: 'hunter',
    MINE: 'mining',
    SMTH: 'smithing',
    FSH: 'fishing',
    COOK: 'cooking',
    FIRE: 'firemaking',
    WC: 'woodcutting',
    FARM: 'farming'
}

/* const OSRS_SKILLS = [
    'attack',
    'strength',
    'defense',
    'ranged',
    'prayer',
    'magic',
    'runecrafting',
    'construction',
    'hitpoints',
    'agility',
    'herblore',
    'thieving',
    'crafting',
    'fletching',
    'slayer',
    'hunter',
    'mining',
    'smithing',
    'fishing',
    'cooking',
    'firemaking',
    'woodcutting',
    'farming'
] */

// interface contracts data structures
const EVENT_TYPE = {
    XP: 'XP',
    UNKNOWN: 'UNKNOWN'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface EventParticipant extends Record<string, any> {
    ign: string
    id: string
}

interface XpEventParticipant extends EventParticipant {
    skills: [{
        startingXp: number
        endingXp: number
    }]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ClanEvent extends Record<string, any> {
    name: string
    startingDate: Date
    endingDate: Date
    type: string
    participants: EventParticipant[]
}

interface XpClanEvent extends ClanEvent {
    skills: string[]
}

// top level data structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ServerData extends Record<string, any> {
    settings: {
        admins: string[]
    }

    events: ClanEvent[]
}
const SERVER_DEFAULT_DATA: ServerData = {
    settings: {
        admins: []
    },

    events: []
}

// command interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Command extends Record<string, any> {
    message: discord.Message
    author: discord.User
    guild: discord.Guild
    input: string
    serverJson: ServerData
}

// system error
class SystemError extends Error {
    errno: number
}

// create our winston logger
const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({
            filename: 'log'
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
})

// log any unexpected errors
const logError = (error: Error): void => {
    logger.error('Unexpected error')
    logger.error(error.message)
}

// loads settings json file of server id
// we want to cache our loads
const load$ = (id: string, dirty: boolean): Observable<ServerData> => {
    if (dirty) {
        this.data[id] = from(jsonfile.readFile(`./servers/${id}.json`, {
            reviver: ((key: string, value: unknown): unknown => {
                if (key.toLowerCase().includes('date')) { return new Date(value as string) }
                return value
            })
        }))
            .pipe(
                catchError((error: SystemError): Observable<ServerData> => {
                    if (error.errno === -2) logger.info('Server has no configuration')
                    else {
                        logError(error)
                        logger.error(`Error loading ${id} from disk`)
                        throw error
                    }
                    return of<ServerData>(SERVER_DEFAULT_DATA)
                }),
                publishReplay(1),
                refCount()
            )
    }
    return this.data[id]
}

// saves settings and trigger a load
const save$ = (id: string, json: ServerData): Observable<ServerData> => of<ServerData>(null)
    .pipe(
        switchMap((): Observable<ServerData> => from(jsonfile.writeFile(`./servers/${id}.json`, json))
            .pipe(
                switchMap((): Observable<ServerData> => load$(id, true))
            )),
        tap((): void => {
            logger.debug(`Wrote settings to ${id}`)
        }),
        catchError((error: SystemError): Observable<ServerData> => {
            logError(error)
            logger.error(`Error writing ${id} to disk`)
            throw error
        })
    )


// event streams
const gClient: discord.Client = new discord.Client()
const ready$ = fromEvent(gClient as unknown as FromEventTarget<void>, 'ready')
const error$ = fromEvent(gClient as unknown as FromEventTarget<Error>, 'error')
const message$ = fromEvent(gClient as unknown as FromEventTarget<discord.Message>, 'message')
const hiscore$ = (ign: string): Observable<JSON> => from(hiscores.getPlayer(ign))
    .pipe(
        publishReplay(1, 10 * 60 * 1000),
        refCount()
    )


// updates a dictionary entry functionally
// eslint-disable-next-line max-len
const update = (dict: Record<string, unknown>, entry: unknown): Record<string, unknown> => Object.assign({}, dict, entry)
// control filters
const hasAdmin = (serverJson: ServerData): boolean => serverJson.settings.admins.length > 0
// eslint-disable-next-line max-len
const isAdmin = (author: discord.User, serverJson: ServerData): boolean => serverJson.settings.admins.includes(author.id)
const isValidDate = (date: Date): boolean => date instanceof Date && !Number.isNaN(date.getTime())


// simple stream subs
// log any errors from error stream
error$.subscribe((error: Error): void => {
    logger.error(error.message)
})

// reconnect and notify
const reconnect$: Observable<void> = ready$
    .pipe(
        skip(1)
    )
reconnect$.subscribe(
    logger.info('Reconnected')
)

// connect and print info about server
const connect$: Observable<void> = ready$
    .pipe(
        take(1)
    )
connect$.subscribe((): void => {
    logger.info('Connected')
    logger.info('Logged in as:')
    logger.info(`* ${gClient.user.username}`)
    logger.info(`* ${gClient.user.id}`)

    logger.verbose(`In ${gClient.guilds.size} guilds:`)
    gClient.guilds.forEach((guild): void => {
        logger.verbose(`* ${guild.name} (${guild.id})`)
        logger.verbose('* Loading guild json')
        load$(guild.id, true).subscribe((data: ServerData): void => {
            logger.debug(`Loaded json for guild ${guild.id}`)
            logger.silly(`${JSON.stringify(data)}`)
        })
    })
})

// generic message handler
const filteredMessage$ = (find: string): Observable<Command> => message$
    .pipe(
        // filter our messages with find
        // and necessary discord checks
        filter((msg: discord.Message): boolean => msg.guild
            && msg.guild.available
            && msg.content.toLowerCase().startsWith(find)),

        // create new observable stream
        // containing the original message
        // the command and the server json
        // for error handling of load
        switchMap((msg: discord.Message): Observable<Command> => of<discord.Message>(msg)
            .pipe(
                switchMap((): Observable<Command> => forkJoin(
                    {
                        message: of<discord.Message>(msg),
                        author: of<discord.User>(msg.author),
                        guild: of<discord.Guild>(msg.guild),
                        input: of<string>(msg.content.slice(find.length)),
                        serverJson: load$(msg.guild.id, false)
                    }
                )),
                catchError((error: Error): Observable<Command> => {
                    logError(error)
                    return forkJoin(
                        {
                            message: of<discord.Message>(msg),
                            author: of<discord.User>(msg.author),
                            guild: of<discord.Guild>(msg.guild),
                            input: of<string>(msg.content.slice(find.length)),
                            serverJson: of<ServerData>(SERVER_DEFAULT_DATA)
                        }
                    )
                })
            )),
        tap((command: Command): void => {
            logger.debug(`message: ${command.message.content}`)
            logger.debug(`author: ${command.author.username}`)
            logger.debug(`guild: ${command.guild.name}`)
            logger.debug(`input: ${command.input}`)
            logger.silly(`serverJson: ${(JSON.stringify(command.serverJson))}`)
        })
    )

const debug$ = filteredMessage$('!f debug')
    .pipe(
        filter((command: Command): boolean => isAdmin(command.author, command.serverJson))
    )
debug$.subscribe((command: Command): void => {
    logger.info('Debug called')
    logger.debug(JSON.stringify(command.serverJson, null, 4))
})

const addAdmin$ = filteredMessage$('!f add admin')
    .pipe(
        filter((command: Command): boolean => isAdmin(command.author, command.serverJson)
            || !hasAdmin(command.serverJson)),
        filter((command: Command): boolean => command.message.mentions.members.array().length > 0),
        switchMap((command: Command): Observable<[ServerData, discord.Message]> => {
            const mentions: string[] = command.message.mentions.members.array()
                .map((member: discord.GuildMember): string => member.id)
            const newSettings: Record<string, unknown> = update(command.serverJson.settings, {
                admins: Array.from(new Set(command.serverJson.settings.admins.concat(mentions)))
            })
            const newData: ServerData = update(command.serverJson, {
                settings: newSettings
            }) as ServerData
            return forkJoin(
                save$(command.guild.id, newData),
                of(command.message)
            )
        })
    )
addAdmin$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Admin added')
    saveMsgArr[1].reply('admin added')
})

const findFirstRegexesMatch = (regexes: RegExp[], search: string): string[] => {
    const foundRegexes: string[][] = regexes.map(
        (regex: RegExp): string[] => regex.exec(search)
    )
    const filteredRegexes: string[][] = foundRegexes.filter(
        (results: string[]): boolean => results !== null && results.length >= 2
    )
    const parsedRegexes: string[] = filteredRegexes.map(
        (results: string[]): string => results[1]
    )
    return parsedRegexes
}
const regexTermStr = 'type|skills|starting|ending|name|$'
const regexCommandStr = `(?:\\s|)+(.*?)(?:\\s|)+(?:${regexTermStr})`
const addGenericEvent$ = filteredMessage$('!f add event ')
    .pipe(
        // admins only
        filter((command: Command): boolean => isAdmin(command.author, command.serverJson)),

        // we need at least a name, starting date and end date
        map((command: Command): [Command, ClanEvent] => {
            const regexes: RegExp[] = [
                new RegExp(`name${regexCommandStr}`, 'gim'),
                new RegExp(`starting${regexCommandStr}`, 'gim'),
                new RegExp(`ending${regexCommandStr}`, 'gim'),
                new RegExp(`type${regexCommandStr}`, 'gim')
            ]
            const parsedRegexes = findFirstRegexesMatch(regexes, command.input)
            if (parsedRegexes.length !== regexes.length) {
                logger.debug(`Admin ${command.author.username} entered invalid parameters`)
                command.message.reply('invalid input: requires [name, starting, ending, type] inputs')
                return null
            }
            const dateA: Date = new Date(parsedRegexes[1])
            const dateB: Date = new Date(parsedRegexes[2])
            const startingDate: Date = dateA <= dateB ? dateA : dateB
            const endingDate: Date = dateA > dateB ? dateA : dateB

            const inputType: string = parsedRegexes[3].toUpperCase()
            const type = EVENT_TYPE[inputType] === undefined
                ? EVENT_TYPE.UNKNOWN
                : EVENT_TYPE[inputType]

            const clanEvent: ClanEvent = {
                name: parsedRegexes[0],
                startingDate,
                endingDate,
                type,
                participants: []
            }
            if (!isValidDate(clanEvent.startingDate) || !isValidDate(clanEvent.endingDate)) {
                logger.debug(`Admin ${command.author.username} entered invalid date`)
                command.message.reply('invalid input: starting date or ending date is invalid')
                return null
            }
            return [command, clanEvent]
        }),
        filter((commandEventArr: [Command, ClanEvent]): boolean => commandEventArr !== null),
        tap((commandEventArr: [Command, ClanEvent]): void => {
            logger.debug(`Admin ${commandEventArr[0].author.username} called add event`)
            logger.debug('Event properties: ')
            logger.debug(`* ${commandEventArr[1].name}`)
            logger.debug(`* ${commandEventArr[1].startingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].endingDate.toDateString()}`)
            logger.debug(`* ${commandEventArr[1].type}`)
        })
    )

const addXpEvent$ = addGenericEvent$
    .pipe(
        // eslint-disable-next-line max-len
        filter((commandEventArr: [Command, ClanEvent]): boolean => commandEventArr[1].type === EVENT_TYPE.XP),
        // eslint-disable-next-line max-len
        switchMap((commandEventArr: [Command, ClanEvent]): Observable<[ServerData, discord.Message]> => {
            const skillsRegex = [
                new RegExp(`skills${regexCommandStr}`, 'gim')
            ]
            const parsedRegex = findFirstRegexesMatch(skillsRegex, commandEventArr[0].input)
            if (parsedRegex.length !== skillsRegex.length) {
                logger.debug(`Admin ${commandEventArr[0].author.id} entered no skills`)
                commandEventArr[0].message.reply('invalid input: starting date or ending date is invalid')
                return of<[ServerData, discord.Message]>(null)
            }
            const skills = parsedRegex[0]
            const skillsArr: string[] = skills.split(' ').map(
                (skill: string): string => skill.trim()
            )
            const OSRS_SKILLS_VALUES: string[] = Object.keys(OSRS_SKILLS).map(
                (key: string): string => OSRS_SKILLS[key]
            )
            const filteredSkills: string[] = skillsArr.filter(
                (skill: string): boolean => OSRS_SKILLS_VALUES.includes(skill)
            )
            if (skillsArr.length !== filteredSkills.length) {
                logger.debug(`Admin ${commandEventArr[0].author.id} entered some invalid skill names`)
                commandEventArr[0].message.reply(`invalid input: some skill names entered are invalid\n choices are: [${OSRS_SKILLS.toString}]`)
                return of<[ServerData, discord.Message]>(null)
            }
            const xpClanEvent: XpClanEvent = update(commandEventArr[1], {
                skill: skillsArr
            }) as XpClanEvent
            const events: ClanEvent[] = commandEventArr[0].serverJson.events.concat(xpClanEvent)
            const sortedEvents: ClanEvent[] = stableSort(
                events, (eventA: ClanEvent, eventB: ClanEvent):
                number => eventA.startingDate.getTime() - eventB.startingDate.getTime()
            ) as ClanEvent[]
            const newServerData: ServerData = update(commandEventArr[0].serverJson, {
                events: sortedEvents
            }) as ServerData
            return forkJoin(
                save$(commandEventArr[0].guild.id, newServerData),
                of<discord.Message>(commandEventArr[0].message)
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
addXpEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Event added')
    saveMsgArr[1].reply('event added')
})

const getUpcomingEvents = (events: ClanEvent[]): ClanEvent[] => events.filter(
    (event: ClanEvent): boolean => event.startingDate > new Date()
)
const listUpcomingEvent$ = filteredMessage$('!f list upcoming')
    .pipe(
        map((command: Command): [string, discord.Message] => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const eventsStr = upcomingEvents.map(
                (event: ClanEvent, idx: number): string => {
                    const { name } = event
                    const startingDateStr = event.startingDate.toDateString()
                    const endingDateStr = event.endingDate.toDateString()
                    const { type } = event
                    const retStr = `\n${idx}: ${name} starting: ${startingDateStr} ending: ${endingDateStr} type: ${type}`
                    if (event.skills !== undefined) {
                        const xpEvent: XpClanEvent = event as XpClanEvent
                        const skills: string = xpEvent.skills.join(' ')
                        return retStr.concat(` skills: ${skills}`)
                    }
                    return retStr
                }
            )
            const reply: string = upcomingEvents.length > 0
                ? `upcoming events: ${eventsStr}`
                : 'no upcoming events'
            return [reply, command.message]
        })
    )
listUpcomingEvent$.subscribe((saveMsgArr: [string, discord.Message]): void => {
    logger.debug('List upcoming events called')
    saveMsgArr[1].reply(saveMsgArr[0])
})

const deleteUpcomingEvent$ = filteredMessage$('!f delete upcoming event ')
    .pipe(
        filter((command: Command): boolean => isAdmin(command.author, command.serverJson)),
        tap((): void => {
            logger.debug('Admin called delete upcoming event')
        }),
        switchMap((command: Command): Observable<[ServerData, discord.Message]> => {
            const upcomingEvents: ClanEvent[] = getUpcomingEvents(command.serverJson.events)
            const idxToRemove: number = parseInt(command.input, 10)
            const filteredEvents: ClanEvent[] = upcomingEvents.filter(
                (event: ClanEvent, idx: number): boolean => idx !== idxToRemove
            )
            if (Number.isNaN(idxToRemove) || filteredEvents.length === upcomingEvents.length) {
                logger.debug(`Admin did not specify index (${idxToRemove})`)
                command.message.reply(`no index ${idxToRemove} found`)
                return of<[ServerData, discord.Message]>(null)
            }
            const newServerData: ServerData = update(command.serverJson, {
                events: filteredEvents
            }) as ServerData
            return forkJoin(
                save$(command.guild.id, newServerData),
                of<discord.Message>(command.message)
            )
        }),
        filter((saveMsgArr: [ServerData, discord.Message]): boolean => saveMsgArr !== null)
    )
deleteUpcomingEvent$.subscribe((saveMsgArr: [ServerData, discord.Message]): void => {
    logger.debug('Event deleted')
    saveMsgArr[1].reply('event deleted')
})

// log in
this.data = {}
gClient.login(auth.token)
