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

    areVaccineHashesEqual(hash1, hash2) {
        const nHash1 = hash1.toLowerCase();
        const nHash2 = hash2.toLowerCase();
        if (nHash1.endsWith('*')) {
            return hash2.startsWith(nHash1.substring(0, nHash1.length - 1));
        }

        if (nHash2.endsWith('*')) {
            return hash1.startsWith(nHash2.substring(0, nHash2.length - 1));
        }

        return nHash1 === hash2;
    }
}

module.exports = helpers;
