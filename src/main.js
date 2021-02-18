const http = require('http');
const Discord = require("discord.js");
const fs = require("fs");
const _ = require('underscore');
const CommandProcessor = require('./commandProcessor');
const CommandParser = require('./commandParser');

const client = new Discord.Client();
const settings = JSON.parse(fs.readFileSync("./production.settings.json"));
const token = settings.token;
const cmdProcessor = new CommandProcessor(settings);
const cmdParser = new CommandParser(cmdProcessor);

var activeTimers = {};

function isLongTriggerWord(content) {
    return content.toLowerCase().startsWith(CommandProcessor.longTriggerWord);
}

function isShortTriggerWord(content) {
    return content.toLowerCase().startsWith(CommandProcessor.shortTriggerWord);
}

function executeCommand(fullCommandString, channel) {
    var parseResults = cmdParser.parseCommandTokens(fullCommandString);
    if (parseResults.errorMessage) {
        throw parseResults.errorMessage;
    }
    else {
        // Probably stems from some of initially bad design, but since the handler points
        // back to cmdProc's callbacks and is async, 'this' becomes not-the-cmdproc. So as
        // a hack for now, pass in cmdProc until we can find time to redo this design.
        parseResults.cmdlet.asyncHandler(channel, parseResults, settings, cmdProcessor);
    }
}

async function startHeartbeatTimer() {
    if (settings.heartbeatInterval != 0) {
        var channel = await client.channels.fetch(settings.heartbeatToChannelId);

        if (channel) {
            setInterval(() => {
                channel.send(':heart: I\'m still alive.');
            }, settings.heartbeatInterval);
        }
        else {
            console.log(`Unable to find channel ${settings.polling.postToChannelId} when attempting to start heartbeat timer`);
        }
    }
}

function startPollingTimers() {
    if (settings.polling.enabled === true) {
        console.log('Starting polling timers');

        let path = '/list/providers';            
        let requestOptions = {
            host: settings.vaccineApiHost,
            port: settings.vaccineApiPort,
            path: path
        };

        console.log('Retrieving list of providers for per-provider poll timers...');
        http.get(requestOptions, function(response) {
            response.on('data', async function(contents) {
                var providers = JSON.parse(contents);        // it's an array
                var channel = await client.channels.fetch(settings.polling.postToChannelId);

                if (channel) {
                    providers.forEach(providerName => {                        
                        var pollerSettings = settings.polling[providerName];
                        console.log(`\tStarting polling timer for ${providerName}, every ${pollerSettings.rate} ms`);

                        if (pollerSettings) {
                            var timer = setInterval(() => {
                                let targetChannel = channel;        // Maybe not needed to cache these
                                let cmds = pollerSettings.commands;
                                
                                cmds.forEach(cmd => {
                                    try {
                                        executeCommand(cmd, targetChannel);
                                    }
                                    catch(errmsg) {
                                        console.log(`Poller exec for command: [${cmd}] failed.`);
                                    }
                                });
                            }, pollerSettings.rate);

                            // Store the timer
                            activeTimers[providerName] = timer;
                        }
                    });
                }
                else {
                    console.log(`Unable to find channel ${settings.polling.postToChannelId} when attempting to start polling timers`);
                }
            })
        });        
    }
    else {
        console.log('Polling disabled, nothing started');
    }
}


client.once("ready", () => {
    console.log("Ready to help you get immunized!");

    startPollingTimers();
    startHeartbeatTimer();
});

client.on("message", message => {
    if (message.author.bot) {
        return;
    }
    
    var inputCommand = message.content;

    if (isShortTriggerWord(inputCommand)) {
        // rewrite the command to imply the "schedules" action
        inputCommand = inputCommand.replace(CommandProcessor.shortTriggerWord, `${CommandProcessor.longTriggerWord}${CommandProcessor.schedulesCommand} `);
    }

    if (!isLongTriggerWord(inputCommand)) {
        // NOOP
        return;
    }

    try {
        executeCommand(inputCommand, message.channel);
    }
    catch(errmsg) {
        console.log(errmsg);
        message.channel.send(errmsg);
    }
});


client.login(token);
