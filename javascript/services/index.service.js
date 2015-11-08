(function () {
    'use strict';

    angular
        .module('guiapp.services')
        .factory('indexService', IndexService);

    function IndexService() {
        return {
            name: "unknown",
            numreplicas: 0
        };
    }
})();
