const _ = require('underscore');

// Just here to declutter main, we still need the cmdletDefinitions to be passed in
class CommandParser {
    // Sorry for the dampness. We'll sort this out later
    static getCmdletDefinition(cmdletName, cmdletDefinitions) {
        let cmdletToLower = cmdletName.toLowerCase();
        return _.find(cmdletDefinitions, function(cmd) {
            return cmd.name === cmdletToLower;
        });
    }

    static parseCommandTokens(fullContentString, cmdletDefinitions) {
        let tokens = fullContentString.split(' ');

        // First token is triggerCommand, we don't need to validate that again so skip it.
        if (tokens.length > 1) {
            let cmdlet = this.getCmdletDefinition(tokens[1], cmdletDefinitions);
            if (cmdlet) {            
                let paramTokens = tokens.slice(2);
                let requiredParams = _.filter(cmdlet.params, function(c) { return c.isRequired === true; });            
                
                // Must meet minimum length requirements
                if (paramTokens.length < requiredParams.length) {
                    return { errorMessage: `We think you wanted the \`${cmdlet.name}\` command, but you're missing some parameters.` };
                }
                
                var paramsTable = {};
                var wildcardValue = null;
                var wildcardedParamName = null;
                var captureRemainderAsWildcard = false;
                for (var i = 0; i < paramTokens.length; ++i) {
                    let paramValue = paramTokens[i].toLowerCase();
                    let paramSpec = i < cmdlet.params.length ? cmdlet.params[i] : null;

                    var assignedParamValue = null;
                    if (paramSpec) {
                        // Assert position of the paramSpec matches current token position first - otherwise this is a mistake on our part
                        if (paramSpec.position === i && paramSpec.isWildcard === false) {
                            if (paramSpec.isSwitch === true) {
                                // For switches, we'll just require you to match the name of the switch to turn it on.
                                assignedParamValue = paramSpec.name === paramValue;
                            }
                            else {
                                assignedParamValue = paramValue;
                            }
                        }
                        else if (paramSpec.isWildcard === true) {
                            // Wildcards capture the remainder of the command as long string buffer. We ignore positional asserts after this point
                            captureRemainderAsWildcard = true;
                            wildcardedParamName = paramSpec.name;
                            wildcardValue = [ paramValue ];
                            continue;
                        }
                        else {
                            // Just a check against ourselves to ensure we don't muck up the params since we don't intend to write unit tests
                            throw `Parameter: ${paramSpec.name} has position: ${paramSpec.position} but we're actually on position: ${i}.`
                        }

                        paramsTable[paramSpec.name] = paramValue;
                    }                    
                    else if (captureRemainderAsWildcard) {
                        wildcardValue.push(paramValue);
                    }
                }

                // Concat the wildcard
                if (captureRemainderAsWildcard === true) {
                    paramsTable[wildcardedParamName] = wildcardValue.join(' ');
                }
                
                return {
                    command: cmdlet.name,
                    cmdlet: cmdlet,
                    params: paramsTable
                };
            }

            return { errorMessage: `We don\'t recognize that command. Type \`${triggerWord} ${helpCommand}\` for a list of commands.` };
        }
        else {
            return { errorMessage: `You need to specify a command. Type \`${triggerWord} ${helpCommand}\` for a list of commands.` };
        }
    }
}

module.exports = CommandParser;
