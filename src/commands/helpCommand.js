class HelpCommand {
    constructor(settings) {
        this._settings = settings;

        this.name = "help";

        this.params = [
            { name: 'command', isRequired: false, isSwitch: false, isGlob: true, position: 0 }
        ];

        // For now, we'll hardcode the other command names other than this one since they should remain isolated
        // from each other.
        this.helpText = `Usage: *${this._settings.command.longTriggerWord} ${this.name}* [command_name]\n
\`\`\`Available commands:\n
list: Lists vaccine providers
schedules: Shows vaccine appointments for a specific state/city/provider
notify: Notifies you when a vaccine becomes available
\`\`\``;
    }

    async asyncHandler(channel, commandContext, discordClient, cmdProc) {
        if (commandContext.params.command) {
            // Show help for a specific command. Find the cmdlet definition and get its help text
            let commandName = commandContext.params.command;
            let cmdlet = cmdProc.getCmdletDefinition(commandName);
            if (cmdlet) {
                channel.send(cmdlet.helpText);
            }
            else {
                channel.send(`The command ${commandName} does not exist.`);
            }
        }
        else {
            // Show commands
            channel.send(commandContext.cmdlet.helpText);
        }
    }
}

module.exports = HelpCommand;
