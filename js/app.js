'use strict';

// Declare app level module which depends on filters, and services
var myApp = angular.module('myApp', ['ngRoute','myApp.filters', 'myApp.services', 'myApp.directives', 'ui.bootstrap', 'dangle','elasticsearch']).
        config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: DashboardCtrl});
            $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: NodeInfoCtrl});
            $routeProvider.when('/search', {templateUrl: 'partials/search.html', controller: SearchCtrl});
            $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: QueryCtrl});
            $routeProvider.when('/graph', {templateUrl: 'partials/graph.html', controller: GraphCtrl});
            $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
            $routeProvider.otherwise({redirectTo: '/dashboard'});
        }]);

myApp.value('localStorage', window.localStorage);

myApp.factory('$exceptionHandler', function($injector) {
    return function(exception, cause) {
        var errorHandling = $injector.get('errorHandling');
        errorHandling.add(exception.message);
        throw exception;
    };
});