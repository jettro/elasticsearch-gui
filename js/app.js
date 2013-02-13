'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['myApp.filters', 'myApp.services', 'elasticjs.service', 'myApp.directives']).
        config(['$routeProvider', function ($routeProvider) {
            $routeProvider.when('/dashboard', {templateUrl: 'partials/dashboard.html', controller: DashboardCtrl});
            $routeProvider.when('/node/:nodeId', {templateUrl: 'partials/node.html', controller: NodeInfoCtrl});
            $routeProvider.when('/stats', {templateUrl: 'partials/stats.html', controller: StatsCtrl});
            $routeProvider.when('/query', {templateUrl: 'partials/query.html', controller: QueryCtrl});
            $routeProvider.otherwise({redirectTo: '/dashboard'});
        }]).
        directive('navbar', ['$location', function ($location) {
            return {
                restrict: 'EA',
                transclude: true,
                scope: {heading: '@'},
                controller: 'NavbarCtrl',
                templateUrl: 'templates/navbar/navbar.html',
                replace: true,
                link: function ($scope, $element, $attrs, navbarCtrl) {
                    $scope.$location = $location;
                    $scope.$watch('$location.path()', function (locationPath) {
                        navbarCtrl.selectByUrl(locationPath)
                    });
                }
            }
        }]);