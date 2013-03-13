'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'elasticjs.service', 'myApp.directives', 'ui.bootstrap', 'dangle']).
        config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: DashboardCtrl});
            $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: NodeInfoCtrl});
            $routeProvider.when('/stats', {templateUrl: 'partials/stats.html', controller: StatsCtrl});
            $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: QueryCtrl});
            $routeProvider.when('/facets', {templateUrl: 'partials/facets.html', controller: FacetsCtrl});
            $routeProvider.when('/about', {templateUrl: 'partials/about.html'});
            $routeProvider.otherwise({redirectTo: '/dashboard'});
        }]);