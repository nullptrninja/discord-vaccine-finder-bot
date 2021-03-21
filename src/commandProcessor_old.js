const axios = require('axios');
const _ = require('underscore');

class CommandProcessor {
    static longTriggerWord = '!vaccine ';
    static shortTriggerWord = '!vac ';
    static helpCommand = 'help';
    static listCommand = 'list';
    static notifyCommand = 'notify';
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
            name: CommandProcessor.notifyCommand,
            params: [
                { name: 'state', isRequired: true, isSwitch: false, isWildcard: false, position: 0 },
                { name: 'city', isRequired: true, isSwitch: false, isWildcard: false, position: 1 },
                { name: 'provider', isRequired: false, isSwitch: false, isWildcard: true, position: 2 }
            ],
            asyncHandler: this.execNotifyCommandAsync,
            helpText: `Usage: *${CommandProcessor.longTriggerWord} ${CommandProcessor.notifyCommand}* \`2_digit_state\` \`city\` \`[site_name]\`\n
The bot will DM you when a vaccine is marked as available in the specified city + state. To register multiple cities, call this command again with a different city. The site name is optional
if you only want to be notified from a specific vaccine site.`
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

    }

    async execListCommandAsync(channel, context, settings, cmdProc) {

    }

    async execSchedulesCommandAsync(channel, context, settings, cmdProc) {

    }

    async execOnlyAvailableSchedulesCommandAsync(channel, context, settings, cmdProc) {

    }
}

module.exports = CommandProcessor;
