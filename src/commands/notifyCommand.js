const helpers = require('../helpers');

const actionParam = '-a';
const stateParam = '-s';
const cityParam = '-c';
const siteParam = '-z';

class NotifyCommand {
    constructor(settings, notificationData) {
        this._settings = settings;
        this.name = "notify";

        this.params = [
            { name: 'expression', isRequired: true, isSwitch: false, isGlob: true, position: 0 },
        ];

        this.helpText = `Usage: *${this._settings.command.longTriggerWord} ${this.name}* \`-a add|del\` \`-s 2_digit_state\` \`-c city\` \`[-z site_name]\`\n
The bot will DM you when a vaccine is marked as available in the specified city + state. To register multiple cities, call this command again with a different city. The site name is optional
if you only want to be notified from a specific vaccine site.
\`${actionParam}\`: Required: \`add\` to add a notification or \`del\` to remove yourself from one.
\`${stateParam}\`: Required: the 2 digit code of the state.
\`${cityParam}\`: Required; the name of the city.
\`${siteParam}\`: Optional: if you only notifications from a specific site, enter its full name with spaces here.`

        this._notifications = notificationData;
    }

    async asyncHandler(channel, commandContext, discordClient, cmdProc) {
        const unparsedCommand = commandContext.params['expression'];
        const argTokens = unparsedCommand.split(/[\s]?(-[ascz])\s/);

        var currentMode = '';
        var self = this;
        var modeHandlers = {};

        modeHandlers[stateParam] = function (t) {
            if (self._verifySingleString(t)) {
                return self._readSingleString(t);
            }
            return { error: 'value cannot be empty' };
        };
        modeHandlers[cityParam] = function (t) {
            if (self._verifySingleStringWithSpaces(t)) {
                return self._readSingleString(t);
            }
            return { error: 'value cannot be empty or contain multiple entries' };
        };
        modeHandlers[actionParam] = function (t) {
            const choices = ['add', 'del'];
            if (self._verifyMultipleChoice(t, choices)) {
                return self._readNormalizedString(t);
            }
            return { error: `value must be one of these: \`${choices.join(', ')}\`` };
        };
        modeHandlers[siteParam] = function (t) {
            if (self._verifySingleStringWithSpaces(t)) {
                return self._readSingleString(t);
            }
            return { error: 'value cannot be empty' };
        };

        var assignedParams = {};

        for (var i = 0; i < argTokens.length; ++i) {
            const token = argTokens[i];

            // Dead token, probably leading whitespace
            if (token === '' && currentMode === '') {
                continue;
            }

            // Searching for a parameter
            if (currentMode === '') {
                const normalizedToken = token.toLowerCase();
                if (modeHandlers.hasOwnProperty(normalizedToken)) {
                    currentMode = normalizedToken;
                }
            }
            else {
                const results = modeHandlers[currentMode](token);
                if (results.error) {
                    channel.send(`Error for parameter: ${currentMode}: ${results.error}`);
                    throw 'Failed to add notification.';
                }
                else {
                    assignedParams[currentMode] = results;
                }

                currentMode = '';
            }
        }

        // Verify we have all we need and back fill optionals
        var errorLog = [];
        this._assertRequiredProperty(assignedParams, stateParam, errorLog);
        this._assertRequiredProperty(assignedParams, cityParam, errorLog);
        this._assertRequiredProperty(assignedParams, actionParam, errorLog);
        this._backfillOptionalProperty(assignedParams, siteParam, '*');

        if (errorLog.length > 0) {
            errorLog.forEach(e => channel.send(e));
        }
        else {
            const invokingUserId = commandContext.messageContext.author.id;
            const vaccine_hash = helpers.generateVaccineHash(assignedParams[stateParam], assignedParams[cityParam], assignedParams[siteParam]);
            const event = {
                vaccine_hash: vaccine_hash,
                city: assignedParams[cityParam],
                state: assignedParams[stateParam],
                site: assignedParams[siteParam],
                users: [ invokingUserId ]
            };
            const logFriendlyHashMessage = `${event.city}, ${event.state} -> \`${event.site === '*' ? 'any provider' : event.site}\``;

            if (assignedParams[actionParam] === 'add') {
                const addResult = this._notifications.addNotification(event);

                if (addResult === true) {
                    channel.send(`You will receive DMs when a vaccine is available for: ${logFriendlyHashMessage}`);
                    console.log(`Added user ${invokingUserId} to event with hash: ${vaccine_hash}`);
                }
                else {
                    channel.send(`You are already registered to receive notifications for: ${logFriendlyHashMessage}`);
                }
            }
            else if (assignedParams[actionParam] === 'del') {
                const rmResult = this._notifications.removeNotification(event);
                if (rmResult === true) {
                    channel.send(`You will stop receiving notifications for ${logFriendlyHashMessage}`);
                    console.log(`Removed user ${invokingUserId} from event with hash: ${vaccine_hash}`);
                }
                else {
                    channel.send(`You were not registered for any notifications for: ${logFriendlyHashMessage}`);
                }
            }

            console.log(`Saving notifications file: ${this._settings.notificationsFilePath}`);
            this._notifications.saveFile();
        }
    }

    _assertRequiredProperty(obj, propName, errLog) {
        if (!obj.hasOwnProperty(propName)) {
            errLog.push(`Missing required parameter: ${propName}`);
        }
    }

    _backfillOptionalProperty(obj, propName, defaultIfMissing) {
        if (!obj.hasOwnProperty(propName)) {
            obj[propName] = defaultIfMissing;
        }
    }

    _verifyMultipleChoice(token, choices) {
        return choices.includes(token.trim().toLowerCase());
    }

    _verifySingleString(token) {
        return this._verifySingleStringWithSpaces(token) && !token.includes(' ');
    }

    _verifySingleStringWithSpaces(token) {
        if (!token) {
            return false;
        }

        const trimmed = token.trim();
        if (trimmed.length == 0) {
            return false;
        }

        return true;
    }

    _verifyMultiString(token) {
        if (!token) {
            return false;
        }

        const trimmed = token.trim();
        if (trimmed.length == 0) {
            return false;
        }

        return true;
    }

    _readSingleString(token) {
        return token.trim();
    }

    _readMultiString(token) {
        const asTokens = token.split(',').map(t => t.trim());
        return asTokens;
    }

    _readNormalizedString(token) {
        return token.trim().toLowerCase();
    }
}

module.exports = NotifyCommand;
