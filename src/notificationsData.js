const fs = require("fs");
const helpers = require('./helpers');

class NotificationsData {
    constructor(filePath) {
        this.data = {
            events: []
        };

        this._savePath = filePath;
        this._loadRules(filePath);
    }

    addNotification(eventDetails) {
        const matchingEvent = this.findMatchingEvent(eventDetails);
        if (matchingEvent === undefined) {
            this.data.events.push(eventDetails);
            return true;
        }
        else if (matchingEvent.users.find(u => u === eventDetails.users[0]) === undefined) {
            // Not already registered
            matchingEvent.users.push(eventDetails.users[0]);
            return true;
        }

        return false;
    }

    removeNotification(eventDetails) {
        const matchingEvent = this.findMatchingEvent(eventDetails);
        if (matchingEvent !== undefined && matchingEvent.users.find(u => u === eventDetails.users[0]) !== undefined) {
            const rmIndex = matchingEvent.users.indexOf(eventDetails.users[0]);
            matchingEvent.users.splice(rmIndex, 1);

            if (matchingEvent.users.length === 0) {
                // Remove the entire event
                const indexOfEvent = this._indexOfEvent(matchingEvent.vaccine_hash);
                this.data.events.splice(indexOfEvent, 1);
            }
            return true;
        }

        return false;
    }

    findEventsByHash(vaccine_hash) {
        const events = this.data.events.filter(e => helpers.areVaccineHashesEqual(vaccine_hash, e.vaccine_hash));
        return events || [];
    }

    findMatchingEvent(eventDetails) {
        return this.data.events.find(e => helpers.areVaccineHashesEqual(eventDetails.vaccine_hash, e.vaccine_hash));
    }

    _indexOfEvent(vaccine_hash) {
        return this.data.events.findIndex(e => e.vaccine_hash === vaccine_hash);
    }

    saveFile() {
        const obj = this.data;
        const asJson = JSON.stringify(obj, null, 4)
        fs.writeFileSync(this._savePath, asJson);
        console.log(`Saved notifications data file to: ${this._savePath}`);
    }

    _tryCreateBlankFile(filePath) {
        try {
            if (fs.existsSync(filePath) === false) {
                console.log(`Notifications file ${filePath} not found, creating new one.`);

                const blankRules = JSON.stringify(this.data);
                fs.writeFileSync(filePath, blankRules);
            }
        }
        catch(err) {
            throw err;
        }
    }

    _loadRules(filePath) {
        this._tryCreateBlankFile(filePath);

        let rawData = JSON.parse(fs.readFileSync(filePath));
        if (rawData === undefined) {
            console.log(`Could not load notification data: ${filePath}`);
            throw `Could not load notification file: ${filePath} - unable to continue.`
        }

        this.data = rawData;
    }
}

module.exports = NotificationsData;
