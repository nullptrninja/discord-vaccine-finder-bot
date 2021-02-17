const http = require('http');
const Discord = require("discord.js");
const fs = require("fs");
const _ = require('underscore');

const client = new Discord.Client();
const settings = JSON.parse(fs.readFileSync("local.settings.json"));
const token = settings.token;

const triggerWord = '!vaccine ';
const helpCommand = 'help';
const listCommand = 'list';
const fromCommand = 'from';

const cmdletDefinitions = [
    {
        name: helpCommand,
        params: [
            { name: '*', isRequired: false, isSwitch: false, position: 0 }
        ],
        asyncHandler: execHelpCommandAsync,
        helpText: `Usage: *${triggerWord} ${helpCommand}* [command_name]\n\`\`\`Available commands:\n${listCommand}: List vaccine providers\n${fromCommand}: Shows vaccine availability by provider and state\`\`\``
    },
    {
        name: listCommand,
        params: [
            { name: 'providers', isRequired: true, isSwitch: true, position: 0 }
        ],
        asyncHandler: execListCommandAsync,
        helpText: `Usage: *${triggerWord} ${listCommand}* \`providers\`\nList all of the available vaccine providers this bot currently supports.`
    },
    {
        name: fromCommand,
        params: [
            { name: 'provider', isRequired: true, isSwitch: false, position: 0 },
            { name: 'state', isRequired: true, isSwitch: false, position: 1 },
            { name: 'city', isRequired: false, isSwitch: false, position: 2 },
        ],
        asyncHandler: execFromCommandAsync,
        helpText: `Usage: *${triggerWord} ${fromCommand}* \`provider_name\`\nLists availability from a specific provider in a state and city. Type \`${triggerWord} ${listCommand} providers\` for a list of valid providers.`
    }
];

function isTriggerWord(content) {
    return content.toLowerCase().startsWith(triggerWord);
}

function getCmdletDefinition(cmdletName) {
    let cmdletToLower = cmdletName.toLowerCase();
    return _.find(cmdletDefinitions, function(cmd) {
        return cmd.name === cmdletToLower;
    });
}

function parseCommandTokens(content) {
    // Preconditon: Is valid command (isCommand() is true)

    let tokens = content.split(' ');

    // First token is triggerCommand, we don't need to validate that again so skip it.
    if (tokens.length > 1) {
        let cmdlet = getCmdletDefinition(tokens[1]);
        if (cmdlet) {
            // Verify the minimum number of requiredParams have been specified
            let paramTokens = tokens.slice(2);
            let requiredParamNames = _.pluck(_.filter(cmdlet.params, function(c) { return c.isRequired === true; }), 'name');
            let allParamNames = _.pluck(cmdlet.params, 'name');
            let requiredParamsIntersect = _.intersection(paramTokens, requiredParamNames);
            let doesCommandUseWildcardParam = cmdlet.params.length === 1 && cmdlet.params[0].name === '*';

            // The intersection of the required params and actual params should be equal. We gate on required params being met only
            // but our processing loop processs and pairs up all parameters
            if (doesCommandUseWildcardParam || requiredParamsIntersect.length === requiredParamNames.length) {
                // Lastly, pair up the params as <param> <value> pairs. Switches will have their value default to true
                var paramsTable = {};

                // Prime the paramsTable with all the switches set to false.
                _.map(
                    _.pluck(
                        _.filter(cmdlet.params, function(p) { return p.isSwitch === true; })
                        , 'name'),
                    function(s) {
                        paramsTable[s] = false;
                    });

                // Go through each user-specified param and match them up with a param in the command spec.
                var wildcardValue = null;
                if (!doesCommandUseWildcardParam) {
                    for (var i = 0; i < paramTokens.length; ++i) {
                        let paramName = paramTokens[i].toLowerCase();

                        // Double check that param name matches the param name in the spec (includes optionals)
                        if (!_.contains(allParamNames, paramName)) {
                            return { errorMessage: `\`${paramName}\` is not the correct parameter to use the \`${cmdlet.name}\` command. Here's a reminder:\n${cmdlet.helpText}` };
                        }

                        let paramSpec = _.find(cmdlet.params, function(p) { return p.name === paramName; });
                        var paramValue = true;
                        if (!paramSpec.isSwitch) {
                            paramValue = paramTokens[++i];
                        }

                        paramsTable[paramName] = paramValue;
                    }
                }
                else if (paramTokens.length > 0) {
                    // Commands that use wildcarding only support wildcarding as a solo parameter. We use it to aggregate all parameters into one string and place it
                    // under a 'wildcardParam' field instead of the params table
                    wildcardValue = paramTokens.join(' ');
                }

                return {
                    command: cmdlet.name,
                    cmdlet: cmdlet,
                    params: paramsTable,
                    wildcardParam: wildcardValue
                };
            }
            
            return { errorMessage: `We think you wanted the \`${cmdlet.name}\` command, but you're missing some parameters.` };
        }

        return { errorMessage: `We don\'t recognize that command. Type \`${triggerWord} ${helpCommand}\` for a list of commands.` };
    }
}

async function execHelpCommandAsync(message, context) {
    if (context.params.providers) {
        // TODO: List providers from API
    }
    else if (context.wildcardParam != null) {
        let commandName = context.wildcardParam;
        let cmdlet = getCmdletDefinition(commandName);
        if (cmdlet) {
            message.channel.send(cmdlet.helpText);
        }
        else {
            message.channel.send(`The command ${commandName} does not exist. Type ${triggerWord} ${helpCommand} (without any other words after it) to get a list of commands.`);
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
    let path = `/available/${provider}/${state}/${city}`;
    
    let requestOptions = {
        host: settings.vaccineApiHost,
        port: settings.vaccineApiPort,
        path: path
    }

    http.get(requestOptions, function(response) {
        response.on('data', function(contents) {
            var contentsAsJson = JSON.parse(contents);

            // Pretty it up for discord
            let summary = _.map(contentsAsJson._siteData, function(site) {
                let appointmentString = site._hasAppointmentsAvailable ? `[Appointments available!](${site._bookingUrl})` : `No appointments available (${site._status})`;
                return `${site._siteName} - ${site._city}, ${site._state} -> ${appointmentString}`;            
            })

            //let summaryData = summary.join('\n\n');
            let summaryHeader = `\nAppointment statuses for \`${provider.toUpperCase()}\` sites in state: \`${state.toUpperCase()}\`, filtered by city: ${city.toUpperCase()}\n`;

            // Need to chunk things out cuz discord body limits = 2000
            message.channel.send(summaryHeader);

            var bodyLength = 0;
            var sliceStart = 0;
            var sliceEnd = 1;
            for (var i = 0; i < summary.length; ++i) {
                let lineBodySize = summary[i].length;
                if (bodyLength + lineBodySize >= 2000) {
                    let summaryFragment = summary.slice(sliceStart, sliceEnd).join('\n');
                    message.channel.send(summaryFragment);

                    bodyLength = lineBodySize;
                    sliceStart = i;
                    sliceEnd = i + 1;
                }
                else {
                    bodyLength += lineBodySize;
                    ++sliceEnd;                    
                }
            }

            // Clear out buffer
            if (bodyLength > 0) {                
                message.channel.send(summary.slice(sliceStart, sliceEnd).join('\n'));
            }

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

    // Parse content in to commands
    if (!isTriggerWord(message.content)) {
        // NOOP
        return;
    }

    var parseResults = parseCommandTokens(message.content);
    if (parseResults.errorMessage) {
        message.channel.send(parseResults.errorMessage);
    }
    else {
        parseResults.cmdlet.asyncHandler(message, parseResults);
    }

    if (message.content === '!ping') {
        message.channel.send('Pong.');
    }
});


client.login(token);
