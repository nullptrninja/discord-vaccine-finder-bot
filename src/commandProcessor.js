const axios = require('axios');
const _ = require('underscore');

class CommandProcessor {
    static longTriggerWord = '!vaccine ';
    static shortTriggerWord = '!vac ';
    static helpCommand = 'help';
    static listCommand = 'list';
    static schedulesCommand = 'schedules';
    static onlyAvailableSchedules = 'onlyavailableschedules';

    static normalizeUrlPathParams(path) {
        // Technically we can just url encode, but i wanted to keep the URLs looking cleaner for ease of use. So we do some light normalization here.
        return path.replace(' ', '_');
    }

    cmdletDefinitions = [
        {
            name: CommandProcessor.helpCommand,
            params: [
                { name: 'command', isRequired: false, isSwitch: false, isWildcard: true, position: 0 }
            ],
            asyncHandler: this.execHelpCommandAsync,
            helpText: `Usage: *${CommandProcessor.longTriggerWord}${CommandProcessor.helpCommand}* [command_name]\n
\`\`\`Available commands:\n
${CommandProcessor.listCommand}: List vaccine providers\n
${CommandProcessor.schedulesCommand}: Shows vaccine availability by provider and state\`\`\`\n
You can also DM me and run these commands in private at any time too.`
        },
        {
            name: CommandProcessor.listCommand,
            params: [
                { name: 'providers', isRequired: true, isSwitch: true, isWildcard: false, position: 0 }
            ],
            asyncHandler: this.execListCommandAsync,
            helpText: `Usage: *${CommandProcessor.longTriggerWord}${CommandProcessor.listCommand}* \`providers\`\n
List all of the available vaccine providers this bot currently supports.`
        },
        {
            name: CommandProcessor.schedulesCommand,
            params: [
                { name: 'provider', isRequired: true, isSwitch: false, isWildcard: false, position: 0 },
                { name: 'state', isRequired: true, isSwitch: false, isWildcard: false, position: 1 },
                { name: 'city', isRequired: false, isSwitch: false, isWildcard: true, position: 2 },
            ],
            asyncHandler: this.execSchedulesCommandAsync,
            helpText: `Usage: *${CommandProcessor.longTriggerWord} ${CommandProcessor.schedulesCommand}* \`provider_name\` \`2_digit_state\` [\`city name\`]\n
Lists availability from a specific provider in a state and city. Type \`${CommandProcessor.longTriggerWord}${CommandProcessor.listCommand} providers\` for a list of valid providers.`
        },
        {
            name: CommandProcessor.onlyAvailableSchedules,
            params: [
                { name: 'provider', isRequired: true, isSwitch: false, isWildcard: false, position: 0 },
                { name: 'state', isRequired: true, isSwitch: false, isWildcard: false, position: 1 },
                { name: 'city', isRequired: false, isSwitch: false, isWildcard: true, position: 2 },
            ],
            asyncHandler: this.execOnlyAvailableSchedulesCommandAsync,
            helpText: `Internal command, no help available`
        },
    ]

    getCmdletDefinition(cmdletName) {
        let cmdletToLower = cmdletName.toLowerCase();
        return _.find(this.cmdletDefinitions, function(cmd) {
            return cmd.name === cmdletToLower;
        });
    }

    async execHelpCommandAsync(channel, context, settings, cmdProc) {
        if (context.params.command) {
            // Show help for a specific command. Find the cmdlet definition and get its help text
            let commandName = context.params.command;
            let cmdlet = cmdProc.getCmdletDefinition(commandName);
            if (cmdlet) {
                channel.send(cmdlet.helpText);
            }
            else {
                channel.send(`The command ${commandName} does not exist. Type ${CommandProcessor.longTriggerWord} ${CommandProcessor.helpCommand} (without any other words after it) to get a list of commands.`);
            }
        }
        else {
            // Show commands
            channel.send(context.cmdlet.helpText);
        }
    }
    
    async execListCommandAsync(channel, context, settings, cmdProc) {
        let showProviders = context.params['providers'];
        // TODO: List other things here
    
        if (showProviders) {
            const queryUrl = `http://${settings.vaccineApiHost}:${settings.vaccineApiPort}/list/providers`;
            var result = null;
            result = await axios.get(queryUrl)
                                    .catch(function(err) {
                                        console.log(`execListCommandAsync threw error while fetching ${queryUrl}: ${err}`);
                                        result = null;
                                    });
    
            if (result && result.status === 200 && result.data) {
                var contentAsJsonArray = result.data;        // it's an array
                    var quotedNames = _.map(contentAsJsonArray, function(n) {
                        return `\`${n}\``;
                    }).join('\n');
    
                    channel.send(`Here are the current providers we can pull data from:\n${quotedNames}`);
            }
            else {
                console.log(`execListCommandAsync: ${queryUrl} returned but status was not successful: ${result}`);
            }
        }
    }
    
    async execSchedulesCommandAsync(channel, context, settings, cmdProc) {
        // Calls the /schedules/provider/state/city API
        let provider = context.params['provider'];
        let state = context.params['state'];
        let city = context.params['city'] || '';
        let path = CommandProcessor.normalizeUrlPathParams(`/schedules/${provider}/${state}/${city}`);

        const queryUrl = `http://${settings.vaccineApiHost}:${settings.vaccineApiPort}${path}`;
        var result = null;
        result = await axios.get(queryUrl)
                            .catch(function(err) {
                                console.log(`execSchedulesCommandAsync threw error while fetching ${queryUrl}: ${err}`);
                                result = null;
                            });

        if (result && result.status === 200 && result.data) {
            const contents = result.data;

            let summary = _.map(contents._siteData, function(site) {
                let preCursor = site._hasAppointmentsAvailable ? '>> ' : '|  ';
                let appointmentString = site._hasAppointmentsAvailable ? `**Appointments available!** (${site._bookingUrl})` : `No appointments available (${site._status})`;
                return `\n${preCursor}${site._siteName} / ${site._city.toUpperCase()}, ${site._state} / ${appointmentString}`;
            })

            let summaryHeader = `\nAppointment statuses for \`${provider.toUpperCase()}\` sites in state: \`${state.toUpperCase()}\`, filtered by city: ${city.toUpperCase()}`;

            await channel.send(summaryHeader + summary, { split: true });
            channel.send(`\nData timestamp: ${contents._timestamp}`);
        }
        else {
            console.log(`execSchedulesCommandAsync: ${queryUrl} returned but status was not successful: ${result}`);
        }
    }

    async execOnlyAvailableSchedulesCommandAsync(channel, context, settings, cmdProc) {
        // Calls the /schedules/provider/state/city API
        let provider = context.params['provider'];
        let state = context.params['state'];
        let city = context.params['city'] || '';
        let path = CommandProcessor.normalizeUrlPathParams(`/schedules/${provider}/${state}/${city}`);        

        const queryUrl = `http://${settings.vaccineApiHost}:${settings.vaccineApiPort}${path}`;
        var result = null;
        result = await axios.get(queryUrl)
                            .catch(function(err) {
                                console.log(`execSchedulesCommandAsync threw error while fetching ${queryUrl}: ${err}`);
                                result = null;
                            });
    
        if (result && result.status === 200 && result.data) {
            const contents = result.data;    
            const availableSites = _.filter(contents._siteData, function(site) {
                return site._hasAppointmentsAvailable === true;
            });
            console.log(`Available sites for ${provider}: ${availableSites.length}`);

            if (availableSites.length > 0) {
                let summary = _.map(availableSites, function(site) {                    
                    let appointmentString = `**Appointments available!** (${site._bookingUrl})`;
                    return `\n> ${site._siteName}\n> **${site._city.toUpperCase()}**, ${site._state} / ${appointmentString}\n`;
                });
    
                let summaryHeader = `\nAppointment statuses as of ${contents._timestamp} for \`${provider.toUpperCase()}\` sites in state: \`${state.toUpperCase()}\`, filtered by city: ${city.toUpperCase()}`;
                await channel.send(summaryHeader + summary, { split: true });                    
            }
        }
    }
}

module.exports = CommandProcessor;
