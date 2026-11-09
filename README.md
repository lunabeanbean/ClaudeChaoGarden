# Claude Chao Garden

![The chao garden above the typing box: a glowing crystal cave with a fruit tree, an egg and four chao](preview.png)

A little chao garden that lives above the typing box in the Claude desktop app. The chao live in a glowing crystal cave, with soft-lit crystals, a pool and floating motes of light. Chao hatch from eggs, grow up and evolve from the work Claude does in your chats, find a class, and fight corrupted omochao right on the garden. It is a Claude Code mod: it runs on your own computer and adds nothing to what is sent to Claude.

## What happens in the garden

- **Three gardens**: the glowing crystal cave, a moonlit **Dark Garden** (crescent moon, stars, bats, wisps, glowing mushrooms) and a sunset **Light Garden** (a flower meadow with sunflowers, a rosy fence and butterflies). Pick one with `/chao visit`; every chat opens on the same one.
- **Eggs hatch** after you send 8 messages, or 2 hours after they were laid. The garden starts with two eggs and holds up to eight chao.
- **Claude's work ripens coloured fruit** on the tree: Claude's commands ripen red fruit (Power), reading ripens blue (Swim), edits ripen green (Run), and its replies ripen yellow (Fly). At the end of each of Claude's turns the ripe fruit go to the chao that like that colour most, and one falls from the tree for a chao to walk over and eat.
- **One tree for every chat.** The tree is shared by all your chats and projects. It grows over 7 of your messages, in any chat, and how Claude worked makes it a plain, twin or rainbow tree, which changes what its fruit give. Once it is full grown and its 12 snacks are eaten, it is replanted as a new seed.
- **Growing up**: a garden day passes on each day you open a chat. Babies become children, and a well-fed child makes a cocoon and comes out as one of 15 adult forms: Hero, Dark or Neutral (from the hours you chat, and petting), and Normal, Swim, Fly, Run or Power (from its biggest stat; the next biggest can show on top).
- **Classes**: adults find a class from their strongest stat: Healer (Swim), Warrior (Power), Ranger (Run) or Wizard (Fly), with gear that gets better as they level up.
- **Fights**: every so many messages, or when one of Claude's commands fails, a corrupted omochao wanders in and up to four hatched chao fight it on their own. Wins train them and leave a trophy. Late nights, new moons and very long chats bring a tougher challenger once a day.
- **Temperaments and animals in fights**: besides its class, each chao brings its Hero, Dark or Neutral temperament (a passive, plus Rally, Shadow Bite or Mimic once its lean is strong) and the animal pieces it wears (a small buff for one piece, a passive for two, and the animal's own skill once it has been given that animal three times, while a piece is still on). Every chao card shows what is on and what it still needs.
- **Races**: type `/chao race` and up to four chao race along the band, with a countdown, ponds to swim, rocks to climb and glides off the top. Each part runs on one stat (Run, Swim, Power, Fly; Stamina for the last stretch), there is a new course each day, the first three win medals and the winner wears the gold one in the garden. A surprise race also breaks out on its own every so many messages, like the omochao. Races give no stats.
- **Chao cards**: `/chao`, or a click on a chao in the garden, opens a side window with a picture card for each chao: its portrait, stat bars and levels, favourite fruit, how it is growing up (or its class), medals and animal parts, with a Pet button and a card for the tree and the ripening fruit. The cards take the colours of the garden on screen. `/chao help` gives it all as text.
- **Animals and eggs in chat**: now and then a message carries an animal (🦝 🐧 🐰 ...) or an egg 🥚 just under it. Click the animal to give it to a chao (it takes on a part, like a tail or ears) or click the egg to add it to the garden.

The garden never pops up, asks or notifies: you play it only when you want to.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install chao-garden --marketplace lunabeanbean/ClaudeChaoGarden
```

Answer `y` to add the marketplace, then pick a scope (the user scope makes it load everywhere).

From a shell:

```
claude plugin install chao-garden --marketplace lunabeanbean/ClaudeChaoGarden
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `lunabeanbean/ClaudeChaoGarden`, then **Add plugin**.

The garden band shows in the **Claude desktop app**. In a terminal session `/chao` still works, but there is no band.

## Commands

```
/chao [name]                       the chao cards in a side window (a picture card per chao, the tree, fights and races)
/chao help                         the same as text, with how it all works
/chao visit <neutral|dark|light>   which garden is on screen (crystal cave, moonlit wood, sunset meadow)
/chao click <on|off>               whether a click on a chao in the garden opens its card
/chao name <old name> > <new name> rename a chao
/chao pet [name]                   pet a chao
/chao pace <slow|normal|fast>      how fast they grow (1 chao year = 5, 3 or 1 garden days)
/chao garden <on|off>              show or hide the band (your chao keep growing)
/chao fight                        the last fight, move by move
/chao fight now                    a practice fight (no rewards)
/chao fight <off|on>               stop or allow the fights that start on their own
/chao fight every <n>              about how many messages apart the wild omochao come
/chao team [<name>, <name>|clear]  who fights, and who always goes in front
/chao race [<course>]              a race in the band: today's course, or meadow, lagoon, cliffs, sky or grand
/chao race last                    the last race's times
/chao race courses                 every course and its record
/chao race every <n>               about how many messages apart the surprise races come
/chao race <off|on>                stop or allow the surprise races
/chao reset confirm                start the garden over with new eggs
```

## Your name

When a chao is happy it says "I love you!". To have it use your name, set the mod's **Your name** option in the config menu, or in `~/.claude/settings.json`:

```json
{ "pluginConfigs": { "chao-garden": { "options": { "name": "Sam" } } } }
```

## Notes

- The garden is saved on your computer (the mod's own store under `~/.claude/plugins/store/`) and carries across chats.
- It works alongside other mods. It adds its animal and egg buttons under whatever draws the message, and it draws the band above the typing box itself.

Unofficial fan project. Chao and Omochao are from Sega's Sonic the Hedgehog games; this mod is not affiliated with or endorsed by Sega. All drawings in it are original.

## Licence

MIT, see [LICENSE](LICENSE).
