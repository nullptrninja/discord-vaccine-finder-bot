# discord-vaccine-finder-bot
Integrates https://github.com/nullptrninja/vaccine-provider-api with Discord so users can be informed about vaccine availability.

## Installation
Better installation instructions are coming later, for now you can install manually by:
1. You will need `https://github.com/nullptrninja/vaccine-provider-api` installed first. Follow those instructions to get that server running.
2. Pull down this repo and make a copy of `template.settings.json` and name the file `production.settings.json`
3. Open `production.settings.json` and set the host and port to the address of the running `vaccine-provider-api` server.
4. Set your Discord Bot token in the `token` field.
5. Add your bot to the channel of your choice.
6. Run `npm install`
7. Run `node ./src/main.js`
  
To verify things are working, you can run a simple command to verify it's responding:
`!vaccine schedules cvs ny`  
This will ensure that the bot can talk to the API server and you should see some data come back to the channel.
  
## Usage
The bot has a very structured command parser, the general format is:  
`!vaccine COMMAND PARAM1 ... PARAM_N`  
Certain commands require more than one parameter; all parameters are separated by a space.  

## Commands
These are the available commands you can execute within Discord:  
`schedules`  
`list`  
`help`  
  
## Here are the scenarios in which you would use these commands:  

### List vaccine schedules by provider and state  
`!vaccine schedules {provider} {state}`  
**provider**: one of the supported providers. You can get a list of these using `list providers` command (see below).  
**state**: the 2-character state code. Example: `ny`  

### List vaccine schedules by provider, state, and city  
`!vaccine schedules {provider} {state} {city}`
Same parameters as above with the addition of a _city_ filter; the name of the city to filter by. Example: `!vaccine schedules cvs ny stony brook`  

### List vaccine providers
`!vaccine list providers`  
Shows a list of the available providers. You can use these values in place of any parameter that calls for a `provider`.  

### Get help with commands
`!vaccine help`  
Shows a list of commands you can use.  

### Get help with a specific command
`!vaccine help {command}`  
**command**: The name of the command you need help with.  

## Shortcuts
One of the most common actions will be to list providers by state/city. For that, the bot has a short-form command:  
`!vac {provider} {state} {city}`  

Instead of `!vaccine` being the trigger word, we use `!vac`. The `provider`, `state` parameters are still required but `city` remains optional. This is just an alias for the `schedules` command, so if you goof up the error message will reference the `schedules` command anyway.

## Notes
Because of the structured command parsing, you might write something that looks silly but for now that's just how it is. Here's a list of odd quirks so far:  
  
 1. When using the `nys` provider, it's fairly obvious that your state is `NY` but you still need to specify _something_ as the state since the `schedules` command requires a state to be specified. Here's how that looks:  
    `!vaccine schedules nys ny`  
  However, for `nys` we force the state to be `ny` internally, so you can write literally anything in that parameter: `!vaccine schedules nys derp` and it'll be okay. The `city` parameter remains the same though, so you can still specify a city with a non-sense state: `!vaccine schedules nys derp queens`.
