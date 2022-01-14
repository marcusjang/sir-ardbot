<p align="center"><img src="https://user-images.githubusercontent.com/10116562/149304480-e64148b6-880a-4a28-bf6a-71abbae7423a.png" alt="Logo of Sir Ardbot" width="350"></p>

# Sir Ardbot
Sir Ardbot is a node.js-based, web-crawling Discord bot for new products notifications.


## Block diagram
```
┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐ 
│   CHROMIUM   │  parsed page →  │              │                 │              │
│  (Puppeteer) │  ← parsing fn   │              │                 │              │
└──────────────┘                 │              │   broadcasted   │              │
┌──────────────┐                 │              │     messages →  │              │
│  UNIPASS API │   forex data →  │  SIR ARDBOT  │                 │  DISCORD.JS  │
│ (node-fetch) │  ← http request │   (nodejs)   │                 │   (Discord)  │
└──────────────┘                 │              │  ←  command  →  │              │
┌──────────────┐                 │              │   interactions  │              │
│   LOCAL DB   │  ←   data    →  │              │                 │              │
│   (sqlite3)  │     caching     │              │                 │              │
└──────────────┘                 └──────────────┘                 └──────────────┘

  * Discord command registration API-related HTTP calls not shown
```


## Installation & Usage
```shell
git clone https://github.com/marcusjang/sir-ardbot.git
cd sir-ardbot
npm install
node index.js
```

#### Example output in Demo mode, every 90 seconds...
```
  Kilmaor 2006/2016 10 years old 2022-01-13T21:05:28.422Z https://an.excellent.example/an-excellent-kilmaor-2006-2016-10-years-old
  Bennagar 2002/2015 13 years old 2022-01-13T21:05:28.422Z https://an.excellent.example/an-excellent-bennagar-2002-2015-13-years-old
    ...
```
By default, the bot will crawl `about:blank` on [**puppeteer**](https://github.com/puppeteer/puppeteer/) then spit out some *randomly generated products* onto the console.

To properly set up Sir Ardbot for;
 * Crawling (new) products from websites,
 * Fetching currency exchange data (used in calculating to local currencies), and
 * Discord bot integrations,

read further up on [`.env` configurations](#env-configurations) and other module-specific documentations.
 * [Site modules](#site-modules)
 * [Command modules](#command-modules)


## `.env` configurations
```.env
# .env

# Crawler
CRAWLER_INTERVAL=90

# Discord
DISCORD_TOKEN=your_discord_token_goes_here
DISCORD_GUILD_ID=923123456789012345
DISCORD_ROLE_ID=923123456789012346,923123456789012347

# Unipass
UNIPASS_TOKEN=your_unipass_api_token_goes_here
UNIPASS_DISABLE=false

# Puppeteer
PUPPETEER_TIMEOUT=10000
PUPPETEER_PATH=

# Debug
DEBUG=sir-ardbot:*
DEV=true
DRYRUN=false

```
Environments variable are mostly optional just to run the bot, but for the full operation at least Discord configurations are required.

#### Crawler configurations
 * `CRAWLER_INTERVAL` (in seconds)  
   Sets the overall crawling interval in seconds. Defaults to 90s

#### Discord configurations
If either `DISCORD_TOKEN` or `DISCORD_GUILD_ID` is not set, the bot will spit out the results onto the console.
 * `DISCORD_TOKEN`  
   Used for manipulating Sir Ardbot on Discord. Read further on [Discord Developer Portal](https://discord.com/developers/applications)
   
 * `DISCORD_GUILD_ID`  
   The id of Discord Guild/Server Sir Ardbot will be active on. Currently only supports single guild id string
   
 * `DISCORD_ROLE_ID`  
   If set, site output channels with hidden flags will be shown to people with one of these roles. Supports multiple roles separated by comma(,)

 * `DISCORD_DISABLE` = `true|false`  
   Overides and disables Discord functionality of the bot when set to true
    
#### Unipass configurations
 * `UNIPASS_TOKEN`  
   Used for fetching currency exchange rate via Unipass OpenAPI (for calculating prices into USD). Will skip checking if left blank. Read further on [Unipass Portal](https://unipass.customs.go.kr/)
   
 * `UNIPASS_DISABLE` = `true|false`  
   Overides and disables currency-related parts of the bot altogether when set to true
   
#### Puppeteer configurations
 * `PUPPETEER_TIMEOUT` (in miliseconds) 
   Sets Puppeteer timeout duration. Defaults to 10,000ms
   
 * `PUPPETEER_PATH` 
   Sets Puppeteer excutable path for Chromium in case you want to specify a separate Chromium installation (i.e. on Raspberry Pis, etc.)
   
#### Debug configurations
 * `DEBUG`  
   Configures which [**debug**](https://github.com/debug-js/debug) messages to be printed
   
 * `DEV` = `true|false`  
   If set to `true`, Sir Ardbot will skip both recording and broadcasting
   
 * `DRYRUN` = `true|false`  
   If set to `true`, Sir Ardbot will skip broadcasting **but** will be recording to the local db. Overrides `DEV` flag.  
   (Useful for catching up local db without broadcasting)


## Site modules
Sir Ardbot uses **site modules** which is defined by [`classes/site.js`](classes/site.js). You can read about an example in [`sites/_example.js`](sites/_example.js), and/or further documentation in [`sites/README.md`](sites/README.md). 


## Command modules
Sir Ardbot, by the power of [**discord.js**](https://github.com/discordjs/discord.js/), supports a rudimentary form of Discord command handling. Commands are stored in `commands` path with an included example ([`commands/_example.js`](commands/_example.js)) as well.

Read further on discord.js guide page for [Command Handling](https://discordjs.guide/creating-your-bot/command-handling.html).
