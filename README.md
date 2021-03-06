<p align="center"><img src="https://user-images.githubusercontent.com/10116562/149304480-e64148b6-880a-4a28-bf6a-71abbae7423a.png" alt="Logo of Sir Ardbot" width="350"></p>

# Sir Ardbot
Sir Ardbot is a node.js-based, web-crawling Discord bot for new products notifications.


## Block Diagram
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
```sh-session
git clone https://github.com/marcusjang/sir-ardbot.git
cd sir-ardbot
npm install
node index.js
```

#### Example output in Demo mode, every 90 seconds...
```

   from an.excellent.example
  Kilnagar 1985/2016 31 years old
  https://an.excellent.example/an-excellent-kilnagar-1985-2016-31-years-old
    PRICE 199.98 EUR      ABV 45.7 %      SIZE 700 ml

   from an.excellent.example
  Benmaor 1981/2016 35 years old
  https://an.excellent.example/an-excellent-benmaor-1981-2016-35-years-old
    PRICE 337.98 EUR      ABV 48.9 %      SIZE 700 ml

    ...
```
By default, the bot will crawl `about:blank` on [**puppeteer**](https://github.com/puppeteer/puppeteer/) then spit out some *randomly generated products* onto the console.

To properly set up Sir Ardbot for;
 * Crawling (new) products from websites,
 * Fetching currency exchange data (used in calculating to local currencies), and
 * Discord bot integrations,

read further up on [`.env` Configurations](#env-configurations) and other module-specific documentations.
 * [Site Modules](#site-modules)
 * [Command Modules](#command-modules)


## `.env` Configurations
```.env
# .env example

# Crawler
CRAWLER_INTERVAL=90
CRAWLER_DBCHECK=true

# Discord
DISCORD_TOKEN=your_discord_token_goes_here
DISCORD_GUILD_ID=923123456789012345
DISCORD_ROLE_ID=923123456789012346,923123456789012347
DISCORD_DISABLED=false

# Unipass
UNIPASS_TOKEN=your_unipass_api_token_goes_here
UNIPASS_DISABLE=false

# Puppeteer
PUPPETEER_TIMEOUT=10000
PUPPETEER_PATH=
PUPPETEER_CONSOLE=false

# Debug
DEBUG=sir-ardbot:*
DEV=true
DRYRUN=false

```
Environments variable are mostly optional just to run the bot, but for the full operation at least Discord configurations are required.

#### Crawler Configurations
 * `CRAWLER_INTERVAL` (in seconds)  
   Sets the overall crawling interval in seconds. Defaults to 90s

 * `CRAWLER_DBCHECK` = `true|false`  
   If set to `false`, the crawler will skip checking the database to see if the product has been seen

#### Discord Configurations
If either `DISCORD_TOKEN` or `DISCORD_GUILD_ID` is not set, the bot will spit out the results onto the console.
 * `DISCORD_TOKEN`  
   Used for manipulating Sir Ardbot on Discord. Read further on [Discord Developer Portal](https://discord.com/developers/applications)
   
 * `DISCORD_GUILD_ID`  
   The id of Discord Guild/Server Sir Ardbot will be active on. Currently only supports single guild id string
   
 * `DISCORD_ROLE_ID`  
   If set, site output channels with hidden flags will be shown to people with one of these roles. Supports multiple roles separated by comma(,)

 * `DISCORD_DISABLE` = `true|false`  
   Overides and disables Discord functionality of the bot when set to `true`

 * `DISCORD_ERROR_CHANNEL`
   The name of Discord channel for the bot to broadcast errors to. Both this and `DISCORD_ERROR_CATEGORY` needs to be set to enable error broadcasting.

 * `DISCORD_ERROR_CATEGORY`
   The name of category for the Discord channel for the bot to broadcast errors to. Both this and `DISCORD_ERROR_CHANNEL` needs to be set to enable error broadcasting.
    
#### Unipass Configurations
 * `UNIPASS_TOKEN`  
   Used for fetching currency exchange rate via Unipass OpenAPI (for calculating prices into USD). Will skip checking if left blank. Read further on [Unipass Portal](https://unipass.customs.go.kr/)
   
 * `UNIPASS_DISABLE` = `true|false`  
   Overides and disables currency-related parts of the bot altogether when set to `true`
   
#### Puppeteer Configurations
 * `PUPPETEER_TIMEOUT` (in miliseconds)  
   Sets Puppeteer timeout duration. Defaults to 10,000ms
   
 * `PUPPETEER_PATH`  
   Sets Puppeteer excutable path for Chromium in case you want to specify a separate Chromium installation (i.e. on Raspberry Pis, etc.)
   
 * `PUPPETEER_CONSOLE` = `true|false`  
   If set to `true`, the `console` output will be relayed to the nodejs `console`
   
#### Debug Configurations
 * `DEBUG`  
   Configures which [**debug**](https://github.com/debug-js/debug) messages to be printed
   
 * `DEV` = `true|false`  
   If set to `true`, Sir Ardbot will skip both recording and broadcasting
   
 * `DRYRUN` = `true|false`  
   If set to `true`, Sir Ardbot will skip broadcasting **but** will be recording to the local db. Overrides `DEV` flag.  
   (Useful for catching up local db without broadcasting)


## Site Modules
Sir Ardbot uses **site modules** which is defined by [`classes/site.js`](classes/site.js). You can read about an example in [`sites/_example.js`](sites/_example.js), and/or further documentation in [`sites/README.md`](sites/README.md). 


## Command Modules
Sir Ardbot, by the power of [**discord.js**](https://github.com/discordjs/discord.js/), supports a rudimentary form of Discord command handling. Commands are stored in `commands` path with an included example ([`commands/_example.js`](commands/_example.js)) as well.

Read further on discord.js guide page for [Command Handling](https://discordjs.guide/creating-your-bot/command-handling.html).
