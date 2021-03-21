const helpers = require('../helpers');
const axios = require('axios');

class SchedulesCommand {
    constructor(settings) {
        this._settings = settings;

        this.name = "schedules";

        this.params = [
            { name: 'provider', isRequired: true, isSwitch: false, isGlob: false, position: 0 },
            { name: 'state', isRequired: true, isSwitch: false, isGlob: false, position: 1 },
            { name: 'city', isRequired: false, isSwitch: false, isGlob: true, position: 2 },
        ];

        this.helpText = `Usage: *${this._settings.command.longTriggerWord} ${this.name}* \`provider_name\` \`2_digit_state\` [\`city name\`]\n
Lists availability from a specific provider in a state and city.`
    }

    async asyncHandler(channel, commandContext, discordClient, cmdProc) {
        // Calls the /schedules/provider/state/city API
        let provider = commandContext.params['provider'];
        let state = commandContext.params['state'];
        let city = commandContext.params['city'] || '';
        let path = helpers.normalizeUrlPathParams(`/schedules/${provider}/${state}/${city}`);

        const queryUrl = `http://${this._settings.vaccineApiHost}:${this._settings.vaccineApiPort}${path}`;
        var result = null;
        result = await axios.get(queryUrl)
                            .catch(function(err) {
                                console.log(`execSchedulesCommandAsync threw error while fetching ${queryUrl}: ${err}`);
                                result = null;
                            });

        if (result && result.status === 200 && result.data) {
            const contents = result.data;

            let summary = contents._siteData.map(function(site) {
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
}

module.exports = SchedulesCommand;
