<p align="center"><img src="https://i.imgur.com/qcfDqhm.png" width="350"></p>

# Sir Ardbot
Sir Ardbot is a node.js-based, web-crawling Discord bot for new products notifications.


## Block diagram
```
┌──────────────┐                 ┌──────────────┐                            ┌──────────────┐ 
│   CHROMIUM   │  parsed page →  │              │                            │              │
│  (Puppeteer) │  ← parsing fn   │              │                            │              │
└──────────────┘                 │              │                            │              │
┌──────────────┐                 │              │                            │              │
│  UNIPASS API │   forex data →  │  SIR ARDBOT  │   broadcasting messages →  │  DISCORD.JS  │
│ (node-fetch) │  ← http request │   (nodejs)   │  ← command interactions →  │   (Discord)  │
└──────────────┘                 │              │                            │              │
┌──────────────┐                 │              │                            │              │
│   LOCAL DB   │  ←   data    →  │              │                            │              │
│   (sqlite3)  │     caching     │              │                            │              │
└──────────────┘                 └──────────────┘                            └──────────────┘

  * Discord command registration API-related HTTP calls not shown
```


## Usage
```
git clone https://github.com/marcusjang/sir-ardbot.git
cd sir-ardbot
npm install
node index.js

    sir-ardbot:main Sir Ardbot is ready on Discord! Initialising...
```
By default, the bot will crawl `about:blank` on [puppeteer](https://github.com/puppeteer/puppeteer/) then spit out some randomly generated results onto the console.

Read further up on `.env` configurations and site modules below to build up Sir Ardbot to become a proper crawler bot!


## `.env` configurations
```.env
# ./.env

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

#### Discord configurations
If either `DISCORD_TOKEN` or `DISCORD_GUILD_ID` is not set, the bot will spit out the results onto the console.
 * `DISCORD_TOKEN`  
   Used for manipulating Sir Ardbot on Discord. Read further on [Discord Developer Portal](https://discord.com/developers/applications)
   
 * `DISCORD_GUILD_ID`  
   The id of Discord Guild/Server Sir Ardbot will be active on. Currently only supports single guild id string
   
 * `DISCORD_ROLE_ID`  
   If set, site output channels with hidden flags will be shown to people with one of these roles. Supports multiple roles separated by comma(,)
    
#### Unipass configurations
 * `UNIPASS_TOKEN`  
   Used for fetching currency exchange rate via Unipass OpenAPI (for calculating prices into USD). Will skip checking if left blank. Read further on [Unipass Portal](https://unipass.customs.go.kr/)
   
 * `UNIPASS_DISABLE` = `true|false`  
   Overides and disables currency-related parts of the bot altogether when set to true
   
#### Puppeteer configurations
 * `PUPPETEER_TIMEOUT` (in miliseconds) 
   Sets Puppeteer timeout duration, defaults to 10000ms
   
 * `PUPPETEER_PATH` 
   Sets Puppeteer excutable path for Chromium in case you want to specify a separate Chromium installation (i.e. on Raspberry Pis, etc.)
   
#### Debug configurations
 * `DEBUG`  
   Configures which [debug](https://github.com/debug-js/debug) messages to be printed
   
 * `DEV` = `true|false`  
   If set to `true`, Sir Ardbot will skip both recording and broadcasting
   
 * `DRYRUN` = `true|false`  
   If set to `true`, Sir Ardbot will skip broadcasting **but** will be recording to the local db. Overrides `DEV` flag.  
   (Useful for catching up local db without broadcasting)

----

```
More informations to come soon!
```
