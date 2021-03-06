# OSRS Competition Discord Bot
Automatically runs and keeps track of competitive skilling, bossing, bounty, clues, last man standing, and custom clan events posting scores to a Discord channel.

## IMPORTANT NOTES
This bot runs strictly off the OSRS hiscores. Sometimes the [hiscores](https://secure.runescape.com/m=hiscore_oldschool/a=13/overall.ws) will be down or slow. This bot attempts multiple times to grab the scores but sometimes it will fail. The bot will let you know on the scoreboard if the event updated or failed to update. With that in mind here are some **recommendations for Discord Guild Adminstrators:**
* Have a dedicated channel for scoreboard updates.
* Have your users logout *before the event starts.*
* Have your users logout *before the event ends.*
* If the [hiscores](https://secure.runescape.com/m=hiscore_oldschool/a=13/overall.ws) are slow the above steps may need to happen multiple times. Sometimes logging out will not update the OSRS hiscores.
    * I am not responsible for [hiscores](https://secure.runescape.com/m=hiscore_oldschool/a=13/overall.ws) not being updated or being unavaliable and cannot fix this. [Complain to Jagex](https://support.runescape.com/hc/en-gb/articles/207344355-The-website-isn-t-loading-or-is-displaying-incorrectly) or [Jmods on Reddit.](https://www.reddit.com/r/2007scape/)
* This bot should still be considered a beta version and it may be wise to use a [backup tracker such as CML.](https://crystalmathlabs.com/tracker/) Further, not all planned commands are currently implemented.
* If you notice a bug, [open up an issue.](https://github.com/kylemiller3/compyscape/issues/new)

## Setup for server administrators
This sections is only applicable to hosting your own fork of this bot. In order to run this bot you must install Postgresql v9.5 or later with node v11.0.0 or later.

1. [Initialize your Postgresql database.](https://help.ubuntu.com/community/PostgreSQL) The bot expects the database to listen on *localhost:5432* with these credentials.
	* database:  **compyscape**
	* user: **postgres**
	* password: any password of your choosing (see below)
2. Clone this repository and run *npm install*
3. Create a file named **auth.ts** in */src* with the following code:
    ```typescript
    export const privateKey = 'your discord bot private key';
    export const dbPassword = 'the database password you chose';
    ```
4. Follow standard Discord procedure to [create and invite your bot.](https://discordapp.com/developers/applications/)
5. Run *npm start*


## Standard user guide
### Setup for Discord Guild administrators
1. [Invite the bot to your Discord Guild.](https://discordapp.com/api/oauth2/authorize?client_id=598299967450513451&permissions=0&scope=bot)
2. *(Recommended)* Add a new channel for score updates.
3. Type command *.setchannel* and point it to the channel of your choosing.

### Event concepts
**Event** - A basic event without enabling the global option. This event will be localized to your individual Discord Guild. Use this unless you are going to compete with other Discord Guilds.

**Globally enabled event** - A special type of event with the global option enabled. This event has special rules and interactions with commands to prevent trolling and cheating. The creating Discord Guild is considered the owner of the event and can invite other Discord Guilds specifically through their Discord Guild id or leave the event open to any Discord Guild that wants to join.

### Event tracking category lists
These are the valid case sensitive lists of categories and specifics for tracking when using the *.add* command\
Ex: **bosses Chaos Elemental, Cerberus, Giant Mole**

#### bosses
Abyssal Sire,
Alchemical Hydra,
Barrows Chests,
Bryophyta,
Callisto,
Cerberus,
Chambers of Xeric,
Chambers of Xeric: Challenge Mode,
Chaos Elemental,
Chaos Fanatic,
Commander Zilyana,
Corporeal Beast,
Crazy Archaeologist,
Dagannoth Prime,
Dagannoth Rex,
Dagannoth Supreme,
Deranged Archaeologist,
General Graardor,
Giant Mole,
Grotesque Guardians,
Hespori,
Kalphite Queen,
King Black Dragon,
Kraken,
Kree'Arra,
K'ril Tsutsaroth,
Mimic,
Obor,
Sarachnis,
Scorpia,
Skotizo,
The Gauntlet,
The Corrupted Gauntlet,
Theatre of Blood,
Thermonuclear Smoke Devil,
TzKal-Zuk,
TzTok-Jad,
Venenatis,
Vet'ion,
Vorkath,
Wintertodt,
Zalcano,
Zulrah

#### bh
rogue,
hunter

#### clues
all,
beginner,
easy,
medium,
hard,
elite,
master

#### lms

#### skills
attack,
strength,
defense,
ranged,
prayer,
magic,
runecraft,
construction,
hitpoints,
agility,
herblore,
thieving,
crafting,
fletching,
slayer,
hunter,
mining,
smithing,
fishing,
cooking,
firemaking,
woodcutting,
farming

### Administrator commands
**.setchannel** - Sets the scoreboard update channel to the first channel mentioned.

**.add** - Schedules a new event and posts the scoreboard to the channel mentioned in *.setchannel*.
  * See "Event tracking category lists" for list of skills, bosses etc for event tracking.
  * The event id is shown on the newly created scoreboard prefixed with a pound sign (#)
  * Event names cannot be blank.
  * Event names must be less than 50 characters in length.
  * Event must end after the event's start date.
  * The event must run for at least one hour.
  * Globally enabled events disable some command functionality depending on the state of the event. *See other commands for more details.*
  * Globally enabled events must start at least 30 minutes in advance to allow other guilds to signup.
  * Globally enabled events cannot be scheduled more than a week in advance.
  * Globally enabled events disallow custom type events.
  * Globally enabled events are limited to one week in duration.

**.delete** - Deletes an event.
  * Find the event id through the scoreboard or the *.listall* command.
  * Events can only be deleted by the Discord Guild that created them.
  * Globally enabled events cannot be deleted after they have started.

**.end** - Ends an event immediately.
  * Find the event id through the scoreboard or the *.listall* command.
  * Globally enabled events cannot be ended early.

**.forcesignup** - Forces the Discord user mentioned to signup to the event. *Follows the same rules as .signup*.
Shorthand: *.forcesignup id=(event id) rsn=(Runescape name) team=(any teamname) @MentionTheDiscordUserToSignup*
  * It is recommended you use a shorthand syntax for this command otherwise this command will start a bot dialogue for the mentioned user.
  * Find the event id through the scoreboard or the *.listall* command.

**.forceunsignup** - Forces the Discord user mentioned to be removed from the event . *Follows the same rules as .unsignup*.
Shorthand: *.forceunsignup id=(event id) @MentionTheDiscordUserToUnsignup*
  * It is recommended you use a shorthand syntax for this command otherwise this command will start a bot dialogue for the mentioned user.
  * Find the event id through the scoreboard or the *.listall* command.

**.forceupdate** - Forces the scoreboard of an event  to update.
  * Find the event id through the scoreboard or *.listall* command.
  * This command can only be use once per minute per event. Otherwise, this command is ignored.
  * Any administrator from any competing Guild can use this command.
  * Globally enabled events have this command disabled after the event has ended.
  
**.lock** - Locks signups for an event.
  * Find the event id through the scoreboard or *.listall* command.
  * Globally enabled events have this command disabled as they automatically lock.

**.unlock** - Unlocks signups for an event.
  * Find the event id through the scoreboard or *.listall* command.
  * Globally enabled events have this command disabled as they automatically lock.

**.gjoin** - Allows your Discord Guild to compete in a globally enabled event. This enables signups for everyone in your Discord Guild.
  * If your Guild created the event you do not need to run this command.
  * Find the event id through the *.listall* command.

**.gleave** - Disallows and deletes your Guild's team from competing in a globally enabled event.
  * You cannot leave a globally enabled event after it has started.
  * Find the event id through the scoreboard or the *.listall* command.

### User commands
**.listall** - List all events and globally enabled events you have access to.
  * The resulting message will include the event ids of every event.

**.signup** - Signs up for an event.
Shorthand: *.signup id=(event id) rsn=(Runescape name) team=(any teamname)*
  * You must have a valid Runescape name on the Hiscores to signup.
  * You cannot signup the same Runescape name but you may have more than one Runescape account to your name.
  * Changing your Runescape name after you have signed up will cause tracking to cease working.
  * You may change your Discord name after you have signed up.
  * Sometimes the Hiscores are slow or are down. Be patient for a response.
  * Team names must be supplied. Other players can join your team by specifying the same team name.
  * Teams can also be solo.
  * Globally enabled events have teams locked 10 minutes before they start.
  * Globally enabled events have one team per Discord Guild. You will automatically be signed up to the first Discord Team found with your Guild Id.

**.unsignup** - Removes you from an event.
Shorthand: *.unsignup id=(event id)*
  * Find the event id through the scoreboard or the *.listall* command.
  * Globally enabled events have teams locked 10 minutes before they start.

**.help** - Shows a help message less detailed than this document.
