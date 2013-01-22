'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: DashboardCtrl});
    $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: NodeInfoCtrl});
    $routeProvider.when('/stats', {templateUrl: 'partials/stats.html', controller: StatsCtrl});
    $routeProvider.otherwise({redirectTo: '/dashboard'});
  }]);
