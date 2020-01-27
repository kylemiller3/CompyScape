import {
    hiscores,
} from 'osrs-json-api';
import {
    getTagFromDiscordId, gClient, getDisplayNameFromDiscordId, getDiscordGuildName,
} from './main';
import { Utils, } from './utils';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Event {

    /**
     * All possible RuneScape Bosses to track
     * @category Tracking
     */
    export type Bosses = 'Abyssal Sire'
    | 'Alchemical Hydra'
    | 'Barrows Chests'
    | 'Bryophyta'
    | 'Callisto'
    | 'Cerberus'
    | 'Chambers of Xeric'
    | 'Chambers of Xeric: Challenge Mode'
    | 'Chaos Elemental'
    | 'Chaos Fanatic'
    | 'Commander Zilyana'
    | 'Corporeal Beast'
    | 'Crazy Archaeologist'
    | 'Dagannoth Prime'
    | 'Dagannoth Rex'
    | 'Dagannoth Supreme'
    | 'Deranged Archaeologist'
    | 'General Graardor'
    | 'Giant Mole'
    | 'Grotesque Guardians'
    | 'Hespori'
    | 'Kalphite Queen'
    | 'King Black Dragon'
    | 'Kraken'
    | 'Kree\'Arra'
    | 'K\'ril Tsutsaroth'
    | 'Mimic'
    | 'Obor'
    | 'Sarachnis'
    | 'Scorpia'
    | 'Skotizo'
    | 'The Gauntlet'
    | 'The Corrupted Gauntlet'
    | 'Theatre of Blood'
    | 'Thermonuclear Smoke Devil'
    | 'TzKal-Zuk'
    | 'TzTok-Jad'
    | 'Venenatis'
    | 'Vet\'ion'
    | 'Vorkath'
    | 'Wintertodt'
    | 'Zalcano'
    | 'Zulrah'

    /**
     * All possible RuneScape Skills to track
     * @category Tracking
     */
    export type Skills = 'attack'
    | 'strength'
    | 'defense'
    | 'ranged'
    | 'prayer'
    | 'magic'
    | 'runecraft'
    | 'construction'
    | 'hitpoints'
    | 'agility'
    | 'herblore'
    | 'thieving'
    | 'crafting'
    | 'fletching'
    | 'slayer'
    | 'hunter'
    | 'mining'
    | 'smithing'
    | 'fishing'
    | 'cooking'
    | 'firemaking'
    | 'woodcutting'
    | 'farming'

    /**
     * All possible Bounty Hunter stats to track
     * @category Tracking
     */
    export type BountyHunter = 'rogue'
    | 'hunter'

    /**
     * All possible Clue stats to track
     * @category Tracking
     */
    export type Clues = 'all'
    | 'beginner'
    | 'easy'
    | 'medium'
    | 'hard'
    | 'elite'
    | 'master'

    /**
     * Contract for an [[Event]]'s participant
     * @category Event
     */
    export interface Participant {
        discordId: string // their discord id
        customScore: number
        runescapeAccounts: Account[]
    }

    /**
     * Extended contract of a [[Participant]]'s [[Account]]
     * for a competitive [[Event]]
     * @category Event
     */
    export interface Account {
        rsn: string
        starting?: hiscores.Player
        ending?: hiscores.Player
    }

    /**
     * Enum of all possible [[Tracking]] options
     * @category Tracking
     */
    export type TrackingCategory = 'skills'
    | 'bh'
    | 'lms'
    | 'clues'
    | 'custom'
    | 'bosses'

    /**
     * Contract for information on a Team
     * @category Event
     */
    export interface Team {
        name: string
        guildId: string
        participants: Participant[]
    }

    /**
     * Contract for when the event takes place
     * @category Event
     */
    export interface When {
        start: Date
        end: Date
    }

    /**
     * Contract for what the event tracks
     * @category Event
     */
    export interface Tracking {
        category: TrackingCategory
        what: BountyHunter[] | Clues[] | Skills[] | Bosses[] | undefined
    }

    /**
     * Contract to track event messages
     * @category Event
     */
    export interface ChannelMessage {
        channelId: string
        messagesId: string[]
    }

    /**
     * Contract of the information necessary to track a guild
     * @category Event
     */
    export interface Guild {
        discordId: string
        scoreboardMessage?: ChannelMessage
    }

    export interface CompetingGuilds {
        creator: Guild
        others?: Guild[]
    }

    /**
     * Contract for a RuneScape Event
     * @category Event
     */
    export interface Obj {
        id?: number
        name: string
        when: When
        guilds: CompetingGuilds
        teams: Team[]
        tracking: Tracking
        global: boolean
        invitations?: string[]
    }

    /**
     * Gets the [[Tracking]] enum for the given [[Event]]
     * @param event The event to check what we tracked
     * @returns The tracking enum that represents what we tracked
     * @category Helper
     */
    export const getEventTracking = (
        event: Event.Obj
    ): TrackingCategory => {
        if (event.tracking === undefined) return 'custom';
        return event.tracking.category;
    };

    /**
     * Checks an event to see if it is long running
     * @param event The event to check
     */
    export const isLongRunningEvent = (
        event: Event.Obj,
    ): boolean => event.when.end >= Utils.distantFuture;

    /**
     * Checks an event to see if it is a [[EventType.CUSTOM]] type
     * @param event The event to check
     * @returns True if the event is a custom event
     * @category Event Property
     */
    export const isEventCustom = (
        event: Event.Obj
    ): boolean => getEventTracking(event) === 'custom';


    // Process event scoreboards here

    export interface WhatScoreboard {
        lhs: string
        whatScore: number
    }

    export interface AccountScoreboard {
        lhs: string
        accountScore: number
        whatsScores: WhatScoreboard[] | undefined
    }

    export interface ParticipantScoreboard {
        lhs: string
        customScore: number
        participantScore: number
        accountsScores: AccountScoreboard[]
    }

    export interface TeamScoreboard {
        lhs: string
        teamScore: number
        participantsScores: ParticipantScoreboard[]
    }

    /**
     * Gets the status string based on current time for the event
     * @param event The event to get the status from
     * @returns A string
     */
    export const getStatusStr = (
        event: Event.Obj,
    ): string => {
        const now: Date = new Date();
        let status: string;
        if (Utils.isInFuture(event.when.start)) {
            status = 'sign-ups';
        } else if (Utils.isInPast(event.when.end)) {
            status = 'ended';
        } else if (Event.isLongRunningEvent(event)) {
            status = 'active (∞ hrs left)';
        } else {
            status = `active (${Number(((event.when.end.getTime() - now.getTime()) / 3.6e6).toFixed(1)).toLocaleString('en-us')} hrs left)`;
        }
        return status;
    };

    export const getEventScoreboardString = async (
        event: Event.Obj,
        error: Error | undefined = undefined,
        guildId: string,
        currentScoreboard: TeamScoreboard[],
        lastScoreboard: TeamScoreboard[],
        eventType: TrackingCategory,
        granularity: 'teams' | 'participants' | 'accounts' | 'what',
        inversion: boolean = false,
        mode: 'regular' | 'shortened', // boss mode is likely too long make a special case
        numEntries: number = 3,
    ): Promise<string> => {
        // format the string here
        const tabLength = 2;
        const lhsPaddingLength = 6;
        const diffPadding = 2;

        const lhsPad: string = new Array(lhsPaddingLength + 1).join(' ');
        const tab: string = new Array(tabLength + 1).join(' ');

        const promises: Promise<string>[] = currentScoreboard.flatMap(
            (team: TeamScoreboard):
            Promise<string>[] => team.participantsScores.flatMap(
                (participant: ParticipantScoreboard):
                Promise<string> => {
                    const displayName: string | null = getDisplayNameFromDiscordId(
                        gClient,
                        guildId,
                        participant.lhs,
                    );
                    if (displayName === null) {
                        return getTagFromDiscordId(
                            gClient,
                            participant.lhs,
                        );
                    }
                    return Promise.resolve(displayName);
                }
            )
        );
        const tags: string[] = await Promise.all(promises);

        let idx = 0;
        const str: string = currentScoreboard.map(
            (team: TeamScoreboard, idi: number): string => {
                const participantsStr = team.participantsScores.map(
                    (participant: ParticipantScoreboard): string => {
                        const accountsStr = participant.accountsScores.map(
                            (account: AccountScoreboard): string => {
                                if (account.whatsScores !== undefined) {
                                    const whatStr = account.whatsScores.map(
                                        (what: WhatScoreboard): string => `${what.lhs}${tab}${what.whatScore.toLocaleString('en-us')}`
                                    ).join(`\n${tab}${tab}${tab}`);
                                    if (account.accountScore !== 0) {
                                        return `${account.lhs}${tab}${account.accountScore.toLocaleString('en-us')}\n${tab}${tab}${tab}${whatStr}`;
                                    }
                                    return `${account.lhs}\n${tab}${tab}${tab}${whatStr}`;
                                }
                                return account.lhs;
                            }
                        ).join(`\n${tab}${tab}`);
                        let ret: string;
                        if (participant.participantScore !== 0) {
                            ret = `${tags[idx]}${tab}${participant.participantScore.toLocaleString('en-us')}\n${tab}${tab}${accountsStr}`;
                        } else {
                            ret = `${tags[idx]}\n${tab}${tab}${accountsStr}`;
                        }
                        idx += 1;
                        return ret;
                    }
                ).join(`\n${tab}`);
                if (team.teamScore !== 0) {
                    return `${idi + 1}. Team ${team.lhs}${tab}${team.teamScore.toLocaleString('en-us')}\n${tab}${participantsStr}`;
                }
                return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}`;
            }
        ).join('\n');

        const status: string = getStatusStr(event);

        // if (error !== undefined) {
        //     const lastUpdatedStr: string = lastUpdateSuccess === null
        //         ? 'Updated: never'
        //         : `Updated: ${lastUpdateSuccess.toLocaleString('en-us')}`;
        //     return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}\nError: ${error.message}\n${lastUpdatedStr}`;
        // }
        // lastUpdateSuccess = new Date();
        // return `${idi + 1}. Team ${team.lhs}\n${tab}${participantsStr}\nUpdated: ${lastUpdateSuccess.toLocaleString('en-us')}`;
        let ret: string;
        if (error !== undefined) {
            ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\n${error}`;
        } else {
            ret = `Event ${event.name} (${event.tracking.category})\n#${event.id} ${event.when.start.toUTCString()} ${status}\n\n${str}\n\nUpdated: ${new Date().toUTCString()}`;
        }
        if (event.global) {
            const combinedGuilds = event.guilds.others !== undefined
                ? [
                    event.guilds.creator,
                    ...event.guilds.others,
                ]
                : [
                    event.guilds.creator,
                ];
            const competitors: string = combinedGuilds.map(
                (guild: Event.Guild): string => {
                    let guildName: string | null = getDiscordGuildName(
                        gClient,
                        guild.discordId,
                    );
                    guildName = guildName !== null
                        ? `${guildName} `
                        : '';
                    return `${guildName}${guild.discordId}`;
                }
            ).join('\n\t');
            return ret.concat(`\n\nCompetitors:\n\t${competitors}`);
        }
        return ret;
    };

    /**
     * Creates a scoreboard object from an event.
     * This function tallies cumulative point total and sorts the scoreboard.
     * @param event The event to score
     * @returns An array of sorted scoreboards for teams
     */
    export const getEventTeamsScoreboards = (
        event: Event.Obj,
    ): TeamScoreboard[] => {
        // get the tracking category
        const categoryKey: TrackingCategory = event.tracking.category;

        // get the tracking what list
        const whatKeys: string[] | undefined = event.tracking.what;

        const add = (acc: number, x: number): number => acc + x;
        const teamsScores: TeamScoreboard[] | undefined = event.teams.map(
            (team: Team): TeamScoreboard => {
                const participantsScores: ParticipantScoreboard[] = team.participants.map(
                    (participant: Participant): ParticipantScoreboard => {
                        const accountsScores:
                        AccountScoreboard[] = participant.runescapeAccounts.map(
                            (account: Account): AccountScoreboard => {
                                const whatsScores:
                                WhatScoreboard[] | undefined = whatKeys === undefined
                                    ? undefined
                                    : whatKeys.map(
                                        (whatKey: string): WhatScoreboard => {
                                            if (account.ending !== undefined
                                                && account.starting !== undefined) {
                                                // case of a new boss or skill or something
                                                // we may not have the starting defined
                                                if (account.ending[categoryKey] !== undefined
                                                    && account.ending[categoryKey][whatKey] !== undefined
                                                    && (account.starting[categoryKey] === undefined
                                                    || account.starting[categoryKey][whatKey] === undefined)
                                                ) {
                                                    if (categoryKey === 'skills') {
                                                        const ending = account
                                                            .ending
                                                            .skills[whatKey]
                                                            .xp;
                                                        return {
                                                            lhs: whatKey,
                                                            whatScore: ending,
                                                        };
                                                    }
                                                    const ending = account
                                                        .ending[categoryKey][whatKey]
                                                        .score;
                                                    return {
                                                        lhs: whatKey,
                                                        whatScore: ending,
                                                    };
                                                }
                                                if (categoryKey === 'skills') {
                                                    const ending = account
                                                        .ending
                                                        .skills[whatKey]
                                                        .xp;
                                                    const starting = account
                                                        .starting
                                                        .skills[whatKey]
                                                        .xp;
                                                    return {
                                                        lhs: whatKey,
                                                        whatScore: ending - starting,
                                                    };
                                                }
                                                const ending = account
                                                    .ending[categoryKey][whatKey]
                                                    .score;
                                                const starting = account
                                                    .starting[categoryKey][whatKey]
                                                    .score;
                                                return {
                                                    lhs: whatKey,
                                                    whatScore: ending - starting,
                                                };
                                            }
                                            return {
                                                lhs: whatKey,
                                                whatScore: 0,
                                            };
                                        }
                                    ).sort(
                                        (a: WhatScoreboard, b: WhatScoreboard):
                                        number => b.whatScore - a.whatScore
                                    );
                                const accountScore: number = whatsScores === undefined
                                    ? 0
                                    : whatsScores.map(
                                        (what: WhatScoreboard): number => what.whatScore
                                    ).reduce(add);
                                return {
                                    lhs: account.rsn,
                                    accountScore,
                                    whatsScores,
                                };
                            }
                        ).sort(
                            (a: AccountScoreboard, b: AccountScoreboard):
                            number => b.accountScore - a.accountScore
                        );
                        const customScore: number = participant.customScore;
                        const participantScore: number = accountsScores.map(
                            (account: AccountScoreboard): number => account.accountScore,
                            customScore,
                        ).reduce(add);

                        return {
                            lhs: participant.discordId,
                            customScore,
                            participantScore,
                            accountsScores,
                        };
                    }
                ).sort(
                    (a: ParticipantScoreboard, b: ParticipantScoreboard):
                    number => b.participantScore - a.participantScore
                );
                const teamScore: number = participantsScores.map(
                    (participant: ParticipantScoreboard):
                    number => participant.participantScore
                ).reduce(add);

                return {
                    lhs: team.name,
                    teamScore,
                    participantsScores,
                };
            }
        ).sort(
            (a: TeamScoreboard, b: TeamScoreboard):
            number => b.teamScore - a.teamScore
        );
        return teamsScores;
    };
}
