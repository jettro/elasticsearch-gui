(function() {
    'use strict';
        var guiapp = angular.module('guiapp',
            [
                'ngRoute',
                'guiapp.filters',
                'guiapp.directives',
                'ui.bootstrap',
                'elasticsearch',
                'gridshore.c3js.chart',
                'guiapp.services',
                'guiapp.dashboard',
                'guiapp.navbar',
                'guiapp.search',
                'guiapp.aggregatedialog'
            ]);

    guiapp.config(['$routeProvider', function ($routeProvider) {
        //$routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: 'DashboardCtrl'});
        $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: 'NodeInfoCtrl'});
        //$routeProvider.when('/search', {templateUrl: 'partials/search.html', controller: 'SearchCtrl'});
        $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: 'QueryCtrl'});
        $routeProvider.when('/inspect', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
        $routeProvider.when('/inspect/:index/:id', {templateUrl: 'partials/inspect.html', controller: 'InspectCtrl'});
        $routeProvider.when('/graph', {templateUrl: 'partials/graph.html', controller: 'GraphCtrl'});
        $routeProvider.when('/tools/suggestions', {templateUrl: 'partials/suggestions.html', controller: 'SuggestionsCtrl'});
        $routeProvider.when('/tools/whereareshards', {templateUrl: 'partials/whereareshards.html', controller: 'WhereShardsCtrl'});
        $routeProvider.when('/tools/snapshots', {templateUrl: 'partials/snapshots.html', controller: 'SnapshotsCtrl'});
        $routeProvider.when('/tools/monitoring', {templateUrl: 'partials/monitoring.html', controller: 'MonitoringCtrl'});
        $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
        $routeProvider.otherwise({redirectTo: '/dashboard'});
    }]);

    guiapp.value('localStorage', window.localStorage);

    //guiapp.factory('$exceptionHandler',['$injector', function($injector) {
    //    return function(exception, cause) {
    //        console.log(exception);
    //        var errorHandling = $injector.get('errorHandling');
    //        errorHandling.add(exception.message);
    //        throw exception;
    //    };
    //}]);

})();