//'use strict';

// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', ['ngRoute','myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.controllers','ui.bootstrap','elasticsearch','gridshore.c3js.chart']).
        config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: 'DashboardCtrl'});
            $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: 'NodeInfoCtrl'});
            $routeProvider.when('/search', {templateUrl: 'partials/search.html', controller: 'SearchCtrl'});
            $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: 'QueryCtrl'});
            $routeProvider.when('/graph', {templateUrl: 'partials/graph.html', controller: 'GraphCtrl'});
            $routeProvider.when('/tools/suggestions', {templateUrl: 'partials/suggestions.html', controller: 'SuggestionsCtrl'});
            $routeProvider.when('/tools/whereareshards', {templateUrl: 'partials/whereareshards.html', controller: 'WhereShardsCtrl'});
            $routeProvider.when('/tools/snapshots', {templateUrl: 'partials/snapshots.html', controller: 'SnapshotsCtrl'});
            $routeProvider.when('/tools/monitoring', {templateUrl: 'partials/monitoring.html', controller: 'MonitoringCtrl'});
            $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
            $routeProvider.otherwise({redirectTo: '/dashboard'});
        }]);

myApp.value('localStorage', window.localStorage);

myApp.factory('$exceptionHandler',['$injector', function($injector) {
    return function(exception, cause) {
        console.log(exception);
        var errorHandling = $injector.get('errorHandling');
        errorHandling.add(exception.message);
        throw exception;
    };
}]);

var serviceModule = angular.module('myApp.services', []);
serviceModule.value('version', '2.0.0');

// TODO jettro: Come up with better separation. Create some actual modules
var controllerModule = angular.module('myApp.controllers',[]);