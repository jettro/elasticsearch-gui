serviceModule.factory('serverConfig', ['$location', function ($location) {
    function ServerConfig(location) {
        if (location.host() == 'www.gridshore.nl') {
            this.host = "http://localhost:9200";
        } else {
            this.host = location.protocol() + "://" + location.host() + ":" + location.port();
        }
    }

    return new ServerConfig($location);
}]);
