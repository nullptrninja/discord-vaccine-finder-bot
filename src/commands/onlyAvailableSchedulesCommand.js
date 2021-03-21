const helpers = require('../helpers');
const axios = require('axios');

class OnlyAvailableSchedulesCommand {
    constructor(settings, notificationData) {
        this._settings = settings;

        this.name = "onlyavailableschedules";

        this.params = [
            { name: 'provider', isRequired: true, isSwitch: false, isGlob: false, position: 0 },
            { name: 'state', isRequired: true, isSwitch: false, isGlob: false, position: 1 },
            { name: 'triggernotify', isRequired: false, isSwitch: true, isGlob: false, position: 2 },
            { name: 'triggernotifynopost', isRequired: false, isSwitch: true, isGlob: false, position: 2 },
        ];

        this.helpText = `Internal command only`
        this._notifications = notificationData;
    }

    async asyncHandler(channel, commandContext, discordClient, cmdProc) {
        // Calls the /schedules/provider/state/city API
        let provider = commandContext.params['provider'];
        let state = commandContext.params['state'];
        let triggerNotify = commandContext.params['triggernotify'];
        let triggerNotifyNoPost = commandContext.params['triggernotifynopost'];
        let path = helpers.normalizeUrlPathParams(`/schedules/${provider}/${state}`);

        const queryUrl = `http://${this._settings.vaccineApiHost}:${this._settings.vaccineApiPort}${path}`;
        var result = null;
        result = await axios.get(queryUrl)
                            .catch(function(err) {
                                console.log(`Threw error while fetching ${queryUrl}: ${err}`);
                                result = null;
                            });

        if (result && result.status === 200 && result.data) {
            const contents = result.data;
            const availableSites = contents._siteData.filter(site => site._hasAppointmentsAvailable === true);
            console.log(`Available sites for ${provider}: ${availableSites.length}`);

            if (availableSites.length > 0) {
                let summary = availableSites.map(function(site) {
                    let appointmentString = `**Appointments available!** (${site._bookingUrl})`;
                    return `\n> ${site._siteName}\n> **${site._city.toUpperCase()}**, ${site._state} / ${appointmentString}\n`;
                });

                // Do notifications here
                var self = this;
                if (triggerNotify === true || triggerNotifyNoPost === true) {
                    availableSites.forEach(function(site) {
                        const vaccineHash = helpers.generateVaccineHash(site._state, site._city, site._siteName);
                        const matchingEvents = self._notifications.findEventsByHash(vaccineHash);

                        console.log(`Found ${matchingEvents.length} matching notification events for hash: ${vaccineHash}`);
                        matchingEvents.forEach(function(e) {
                            e.users.forEach(function(userId) {
                                discordClient.users.fetch(userId, true)
                                                    .then(u => {
                                                        console.log(`Sending DM to user: ${u.id} for hash ${vaccineHash}`);
                                                        u.send(`A vaccine may be available at: ${site._city}, ${site._state} -> ${site._siteName}\nBook at: ${site._bookingUrl}`);
                                                    });
                            });
                        });
                    });
                }

                // If we're triggering without post, then don't post anything to the stated channel
                if (triggerNotifyNoPost === false) {
                    let summaryHeader = `\nAppointment statuses as of ${contents._timestamp} for \`${provider.toUpperCase()}\` sites in state: \`${state.toUpperCase()}\``;
                    await channel.send(summaryHeader + summary, { split: true });
                }
            }
        }
    }
}

module.exports = OnlyAvailableSchedulesCommand;
