const http = require('http');
const Discord = require("discord.js");
const fs = require("fs");

const NotificationsData = require('./notificationsData');
const CommandProcessor = require('./commandProcessor');
const HelpCommand = require('./commands/helpCommand');
const ListCommand = require('./commands/listCommand');
const SchedulesCommand = require('./commands/schedulesCommand');
const OnlyAvailableSchedulesCommand = require('./commands/onlyAvailableSchedulesCommand');
const NotifyCommand = require('./commands/notifyCommand');

const client = new Discord.Client();
const settings = JSON.parse(fs.readFileSync("./production.settings.json"));
const notifications = new NotificationsData(settings.notificationsFilePath)
const token = settings.token;

const cmdletDefinitions = [
    new HelpCommand(settings),
    new ListCommand(settings),
    new SchedulesCommand(settings),
    new OnlyAvailableSchedulesCommand(settings, notifications),
    new NotifyCommand(settings, notifications)
];

const cmdProcessor = new CommandProcessor(cmdletDefinitions, client, settings);

const minimumHeartbeatMs = 30000;
var activeTimers = {};

function isLongTriggerWord(content) {
    return content.toLowerCase().startsWith(settings.command.longTriggerWord);
}

function isShortTriggerWord(content) {
    return content.toLowerCase().startsWith(settings.command.shortTriggerWord);
}

function executeCommand(fullCommandString, channel, messageContext = null) {
    const dtNow = new Date();
    cmdProcessor.processCommand(fullCommandString, channel, messageContext)
        .then(function () {
            console.log(`${dtNow.toISOString()}: Executed ${fullCommandString} successfully`);
        })
        .catch(async function (err) {
            console.log(err);
            channel.send(err);
        });
}

async function startHeartbeatTimer() {
    if (settings.heartbeatInterval >= minimumHeartbeatMs) {
        console.log('Starting heartbeat timer');
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
    else {
        console.log(`Heartbeat disabled; must be greater than or equal to ${minimumHeartbeatMs}`);
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
        inputCommand = inputCommand.replace(settings.command.shortTriggerWord, `${settings.command.longTriggerWord}schedules `);
    }

    if (!isLongTriggerWord(inputCommand)) {
        // NOOP
        return;
    }

    try {
        executeCommand(inputCommand, message.channel, message);
    }
    catch(errmsg) {
        console.log(errmsg);
        message.channel.send(errmsg);
    }
});


client.login(token);
