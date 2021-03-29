# discord-vaccine-finder-bot
Integrates https://github.com/nullptrninja/vaccine-provider-api with Discord so users can be informed about vaccine availability.

## Installation
Better installation instructions are coming later, for now you can install manually by:
1. You will need https://github.com/nullptrninja/vaccine-provider-api installed first. Follow those instructions to get that server running.
2. Pull down this repo and make a copy of `template.settings.json` and name the file `production.settings.json`
3. Open `production.settings.json` and set the host and port to the address of the running `vaccine-provider-api` server.
5. Set your Discord Bot token in the `token` field.
6. Set the Channel Id to the channel of choice. There are 2 channel Id fields, one pertains to heartbeats and the other is the actual information. To disable heartbats, set the rate to 0.
8. Add your bot to the channel of your choice.
9. Run `npm install`
10. Run `node ./src/main.js`
  
To verify things are working, you can run a simple command to verify it's responding:
`!vaccine schedules cvs ny`  
This will ensure that the bot can talk to the API server and you should see some data come back to the channel.

For Linux users, if you're running this on an separate system (like a Pi), you can detach from the process so you can log out of the SSH session safely:
```
node ./src/main.js &  
disown -h <PID HERE>
```
  
## Usage
The bot has a very structured command parser, the general format is:  
`!vaccine COMMAND PARAM1 ... PARAM_N`  
Certain commands require more than one parameter; all parameters are separated by a space.  If privacy is a concern, your users can DM the bot with the same commands as well.

# Usage Notes (Important!)
- While this bot was developed primarily for NY residents, at least one provider (as of this update) supports other states: `CVS`. If you're not eligible for NY vaccines, using CVS is the only alternative provider you can use for this bot at this time.  
   
- The New York State provider (`NYS`) seems to have adopted some data feed changes that do not accurately reflect whether or not actual vaccines are available so therefore you may get a lot of false positives (alerting you for available sites when the data shows none are actually available). You may want to consider only querying NYS sites manually. For notifications, we suggest NYC and CVS sites only.  

## Commands
These are the available commands you can execute within Discord:  
`schedules`  
`list`  
`notify`  
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

### Add a notification when vaccine is available
`!vaccine notify -a add -s {state} -c {city} [-z {site name}]`
This command format is different from the rest due to certain parsing requirements. The site parameter (`-z`) is optional. If omitted, the bot will DM you when any site in the specified state + city is available. State is the two-letter state code, while city is very specific to how certain providers list the city in their vaccination site addresses. You can add as many notifications as you'd like. If you want to only be notified if vaccines are available at a specific site, copy and paste the site's name (as listed via `!vaccine schedules` commnad) into the `-z` parameter.

Examples:  
Just by state + city: `!vaccine notify -a add -s ny -c brooklyn`  
By state + city + site: `!vaccine notify -a add -s ny -c manhattan -z East Harlem Action Health Center (Manhattan)`  

See below for more information on configuration to ensure this feature works.

### Remove a notification
`!vaccine notify -a del -s {state} -c {city} [-z {site name}]`
This will remove a notification. It's the same command as `add` but with `del` instead. Currently there's no way to unsubscribe from all notifications at once.

### Get help with commands
`!vaccine help`  
Shows a list of commands you can use.  

### Get help with a specific command
`!vaccine help {command}`  
**command**: The name of the command you need help with.  

# Notifications
End-users can subscribe to notifications when a city + state has a vaccination available (across all configured providers). However in order to make this work, you (bot admin) need to set up automatic polling timers in the bots configuration for all sites. It's easy though! Here's a sample configuraton of the `polling` section you can copy pasta into your own:
```
    "polling": {
        "enabled": false,
        "postToChannelId": "<A_CHANNEL_ID_HERE_FOR_LOGGING>",
        "cvs": {
            "rate": 100000,
            "commands": [
                "!vaccine onlyAvailableSchedules cvs ny triggernotifynopost"
            ]
        },
        "nys": {
            "rate": 100000,
            "commands": [
                "!vaccine onlyAvailableSchedules nys ny triggernotifynopost"
            ]
        },
        "nyc": {
            "rate": 100000,
            "commands": [
                "!vaccine onlyAvailableSchedules nyc ny triggernotifynopost"
            ]
        }
    }
```

The `onlyAvailableSchedules` command is a hidden internal command that will only show sites with available appointments, coupled with a switch parameter: `triggernotifynopost` which will trigger notifications without posting to the status channel. You can add or remove the different providers as needed (e.g.: if you want exclude `cvs` you can remove it from the polling list) but you must use `triggernotifynopost` for the rest in order to fire off the notifications. In this example, it's configured to fire every 30 minutes. This will also message people at all hours of the night.

This feature is on a per-user basis, meaning whoever registers to be notified will be the one that receives the DM.

## Shortcuts
One of the most common actions will be to list providers by state/city. For that, the bot has a short-form command:  
`!vac {provider} {state} {city}`  

Instead of `!vaccine` being the trigger word, we use `!vac`. The `provider`, `state` parameters are still required but `city` remains optional. This is just an alias for the `schedules` command, so if you goof up the error message will reference the `schedules` command anyway.

## Notes
Because of the structured command parsing, you might write something that looks silly but for now that's just how it is. Here's a list of odd quirks so far:  
  
 1. When using the `nys` provider, it's fairly obvious that your state is `NY` but you still need to specify _something_ as the state since the `schedules` command requires a state to be specified. Here's how that looks:  
    `!vaccine schedules nys ny`  
  However, for `nys` we force the state to be `ny` internally, so you can write literally anything in that parameter: `!vaccine schedules nys derp` and it'll be okay. The `city` parameter remains the same though, so you can still specify a city with a nonsense state: `!vaccine schedules nys derp queens`.
