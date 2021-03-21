const helpers = {
    normalizeUrlPathParams: function(path) {
        // Technically we can just url encode, but i wanted to keep the URLs looking cleaner for ease of use. So we do some light normalization here.
        return path.replace(' ', '_');
    },

    generateVaccineHash(state, city, site) {
        const nState = state.toLowerCase();
        const nCity = city.toLowerCase().replace(' ', '_');
        const nSite = site.toLowerCase().replace(' ', '_');
        return `${nState}-${nCity}-${nSite}`;
    },

    areVaccineHashesEqual(queryHash, staticHash) {
        const nQueryHash = queryHash.toLowerCase();
        if (nQueryHash.endsWith('*')) {
            return staticHash.startsWith(nQueryHash.substring(0, nQueryHash.length - 1));
        }

        return nQueryHash === staticHash;
    }
}

module.exports = helpers;
