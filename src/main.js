const http = require('http');
const Discord = require("discord.js");
const fs = require("fs");
const _ = require('underscore');
const CommandParser = require('./commandParser');

const client = new Discord.Client();
const settings = JSON.parse(fs.readFileSync("./production.settings.json"));
const token = settings.token;

const longTriggerWord = '!vaccine ';
const shortTriggerWord = '!vac ';
const helpCommand = 'help';
const listCommand = 'list';
const schedulesCommand = 'schedules';

const cmdletDefinitions = [
    {
        name: helpCommand,
        params: [
            { name: 'command', isRequired: false, isSwitch: false, isWildcard: true, position: 0 }
        ],
        asyncHandler: execHelpCommandAsync,
        helpText: `Usage: *${longTriggerWord} ${helpCommand}* [command_name]\n\`\`\`Available commands:\n${listCommand}: List vaccine providers\n${schedulesCommand}: Shows vaccine availability by provider and state\`\`\``
    },
    {
        name: listCommand,
        params: [
            { name: 'providers', isRequired: true, isSwitch: true, isWildcard: false, position: 0 }
        ],
        asyncHandler: execListCommandAsync,
        helpText: `Usage: *${longTriggerWord} ${listCommand}* \`providers\`\nList all of the available vaccine providers this bot currently supports.`
    },
    {
        name: schedulesCommand,
        params: [
            { name: 'provider', isRequired: true, isSwitch: false, isWildcard: false, position: 0 },
            { name: 'state', isRequired: true, isSwitch: false, isWildcard: false, position: 1 },
            { name: 'city', isRequired: false, isSwitch: false, isWildcard: true, position: 2 },
        ],
        asyncHandler: execFromCommandAsync,
        helpText: `Usage: *${longTriggerWord} ${schedulesCommand}* \`provider_name\`\nLists availability from a specific provider in a state and city. Type \`${longTriggerWord} ${listCommand} providers\` for a list of valid providers.`
    }
];

function isLongTriggerWord(content) {
    return content.toLowerCase().startsWith(longTriggerWord);
}

function isShortTriggerWord(content) {
    return content.toLowerCase().startsWith(shortTriggerWord);
}

function getCmdletDefinition(cmdletName) {
    let cmdletToLower = cmdletName.toLowerCase();
    return _.find(cmdletDefinitions, function(cmd) {
        return cmd.name === cmdletToLower;
    });
}

function normalizeUrlPathParams(path) {
    // Technically we can just url encode, but i wanted to keep the URLs looking cleaner for ease of use. So we do some light normalization here.
    return path.replace(' ', '_');
}

async function execHelpCommandAsync(message, context) {
    if (context.params.providers) {
        // TODO: List providers from API
    }
    else if (context.params.command) {
        let commandName = context.params.command;
        let cmdlet = getCmdletDefinition(commandName);
        if (cmdlet) {
            message.channel.send(cmdlet.helpText);
        }
        else {
            message.channel.send(`The command ${commandName} does not exist. Type ${longTriggerWord} ${helpCommand} (without any other words after it) to get a list of commands.`);
        }
    }
    else {
        // Show commands
        message.channel.send(context.cmdlet.helpText);
    }
}

async function execListCommandAsync(message, context) {

}

async function execFromCommandAsync(message, context) {
    // Calls the /availability/provider/state/city API
    let provider = context.params['provider'];
    let state = context.params['state'];
    let city = context.params['city'] || ``;
    let path = normalizeUrlPathParams(`/available/${provider}/${state}/${city}`);
    
    let requestOptions = {
        host: settings.vaccineApiHost,
        port: settings.vaccineApiPort,
        path: path
    }

    http.get(requestOptions, function(response) {
        response.on('data', async function(contents) {
            var contentsAsJson = JSON.parse(contents);

            // Pretty it up for discord
            let summary = _.map(contentsAsJson._siteData, function(site) {
                let appointmentString = site._hasAppointmentsAvailable ? `[Appointments available!](${site._bookingUrl})` : `No appointments available (${site._status})`;
                return `  ${site._siteName} - ${site._city}, ${site._state} -> ${appointmentString}`;            
            })

            //let summaryData = summary.join('\n\n');
            let summaryHeader = `\nAppointment statuses for \`${provider.toUpperCase()}\` sites in state: \`${state.toUpperCase()}\`, filtered by city: ${city.toUpperCase()}\n`;

            message.channel.send(summaryHeader);
            await message.channel.send(summary, { split: true });
            message.channel.send(`\n\nEnd of data.\nData last timestamp: ${contentsAsJson._timestamp}`);
        });
    });
}

client.once("ready", () => {
    console.log("Ready to help you get immunized!");
});

client.on("message", message => {
    if (message.author.bot) {
        return;
    }
    
    var inputCommand = message.content;

    if (isShortTriggerWord(inputCommand)) {
        // rewrite the command to imply the "schedules" action
        inputCommand = inputCommand.replace(shortTriggerWord, `${longTriggerWord}${schedulesCommand} `);
    }

    // Parse content in to commands
    if (!isLongTriggerWord(inputCommand)) {
        // NOOP
        return;
    }

    var parseResults = CommandParser.parseCommandTokens(inputCommand, cmdletDefinitions);
    if (parseResults.errorMessage) {
        message.channel.send(parseResults.errorMessage);
    }
    else {
        parseResults.cmdlet.asyncHandler(message, parseResults);
    }
});


client.login(token);
