const axios = require('axios');

class ListCommand {
    constructor(settings) {
        this._settings = settings;

        this.name = "list";

        this.params = [
            { name: 'providers', isRequired: true, isSwitch: true, isGlob: false, position: 0 }
        ];

        this.helpText = `Usage: *${this._settings.command.longTriggerWord} ${this.name}* \`providers\`\n
List all of the available vaccine providers this bot currently supports.`
    }

    async asyncHandler(channel, commandContext, discordClient, cmdProc) {
        const showProviders = commandContext.params['providers'];

        if (showProviders) {
            const queryUrl = `http://${this._settings.vaccineApiHost}:${this._settings.vaccineApiPort}/list/providers`;
            var result = null;
            result = await axios.get(queryUrl)
                                    .catch(function(err) {
                                        console.log(`Error while fetching ${queryUrl}: ${err}`);
                                        result = null;
                                    });

            if (result && result.status === 200 && result.data) {
                var contentAsJsonArray = result.data;        // it's an array
                var quotedNames = contentAsJsonArray.map(function(n) {
                    return `\`${n}\``;
                }).join('\n');

                channel.send(`Here are the current providers we can pull data from:\n${quotedNames}`);
            }
            else {
                console.log(`execListCommandAsync: ${queryUrl} returned but status was not successful: ${result}`);
            }
        }
    }
}

module.exports = ListCommand;
