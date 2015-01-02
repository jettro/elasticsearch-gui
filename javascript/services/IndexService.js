serviceModule.factory('indexService', [function () {
    function IndexService() {
        this.name = "unknown";
        this.numReplicas = 0;
    }

    return new IndexService();
}]);
